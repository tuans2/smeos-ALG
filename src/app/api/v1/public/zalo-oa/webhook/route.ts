import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { log } from "@/core/observability/log"
import { ZaloOaPlatformClient } from "@/modules/greeting-card/adapters/staff-channels/zalo-oa-platform"
import { ChainBranchRepository } from "@/modules/greeting-card/infra/chain-branch-repository"
import { ZaloOaTokenVault } from "@/modules/greeting-card/infra/platform-secret-repository"
import {
  handleZaloOaEvent,
  isFreshEvent,
  verifyZaloSignature,
  type ZaloWebhookEvent,
} from "@/modules/greeting-card/use-cases/zalo-oa-link"
import { defineRoute } from "@/core/http/define-route"

/** Thân webhook Zalo nhỏ; quá ngưỡng → bỏ, không đọc tiếp */
const MAX_BODY_BYTES = 64 * 1024

/**
 * POST /api/v1/public/zalo-oa/webhook — Zalo OA chung của nền tảng báo sự kiện.
 * Chỉ xử lý tin nhắn chứa mã liên kết chi nhánh. Xác thực bằng chữ ký `X-ZEvent-Signature`
 * (OA secret key) + chống phát lại theo `timestamp`; sai → 401, không tiết lộ lý do.
 * Luôn trả 200 cho sự kiện hợp lệ để Zalo không gửi lại.
 */
export const POST = defineRoute({
  auth: { kind: "custom", reason: "webhook Zalo OA — chữ ký kiểm trong handler" },
  rateLimit: { scope: "zalo-oa-webhook", limit: 600, windowMs: 60_000, per: "ip" },
  handler: async ({ request }) => {
    const rawBody = await request.text()
    if (rawBody.length > MAX_BODY_BYTES) return jsonResponse({ error: "Payload too large" }, { status: 413 })

    let event: ZaloWebhookEvent
    try {
      event = JSON.parse(rawBody) as ZaloWebhookEvent
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, { status: 400 })
    }

    const appId = process.env.ZALO_OA_APP_ID
    const signed = verifyZaloSignature({
      rawBody,
      header: request.headers.get("x-zevent-signature"),
      appId,
      oaSecretKey: process.env.ZALO_OA_WEBHOOK_SECRET,
      timestamp: event.timestamp,
    })
    if (!signed || event.app_id !== appId || !isFreshEvent(event.timestamp)) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 })
    }

    const client = new ZaloOaPlatformClient(new ZaloOaTokenVault())
    const outcome = await handleZaloOaEvent(event, {
      linkZaloUser: (code, userId) => new ChainBranchRepository().linkZaloUser(code, userId),
      reply: (userId, text) => client.sendText(userId, text),
    })
    if (outcome !== "IGNORED") log.info("zalo_oa.link_event", { outcome })
    return jsonResponse({ ok: true })
  },
})

export const dynamic = "force-dynamic"
