import { asSystemDb } from "@/core/tenancy/db-context"
import { NextRequest, NextResponse } from "next/server"
import { claimIdempotencyKey } from "@/core/idempotency/infra/idempotency-repository"
import { ChatChannelRepository } from "@/modules/chat-assistant/infra/chat-channel-repository"
import { handleIncomingChannelMessage } from "@/modules/chat-assistant/use-cases/handle-incoming-channel-message"
import { isFreshEvent, verifyZaloSignature } from "@/modules/greeting-card/use-cases/zalo-oa-link"
import { recordManagedWebhook } from "@/modules/integration-hub/use-cases/record-managed-webhook"
import { isOwnConnectionAllowed } from "@/modules/integration-hub/use-cases/governance-mode"

/** Webhook / widget công khai ngoài `handle()`: chạy quyền hệ thống (tổ chức suy từ kênh), như nhóm đường dẫn của `handle()`. */
export async function POST(req: NextRequest) {
  return asSystemDb("route:/api/v1/chat/webhooks/zalo", () => postUnscoped(req))
}

async function postUnscoped(req: NextRequest) {
  const rawBody = await req.text()
  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    // AUD-028: chữ ký X-ZEvent-Signature theo App ID + Secret Key của chính OA tiệm đã cấu hình, kèm
    // chống phát lại theo timestamp — kiểm TRƯỚC khi đọc nội dung sự kiện. OA lạ / sai chữ ký → 401.
    const oaId = typeof body.oa_id === "string" ? body.oa_id : ""
    const channelIntegration = oaId ? await new ChatChannelRepository().findActiveByZaloOaId(oaId) : null
    const zaloAppId = channelIntegration?.config.zaloAppId
    const signed =
      !!channelIntegration &&
      verifyZaloSignature({
        rawBody,
        header: req.headers.get("x-zevent-signature"),
        appId: zaloAppId,
        oaSecretKey: channelIntegration.config.zaloSecretKey,
        timestamp: body.timestamp,
      }) &&
      String(body.app_id) === String(zaloAppId) &&
      isFreshEvent(body.timestamp)
    if (!channelIntegration || !signed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const senderId = body.sender?.id || body.user_id_by_app
    const messageText = body.message?.text
    const messageId = body.message?.msg_id
    // E5.3: Zalo gửi lại sự kiện khi phản hồi chậm — mỗi tin chỉ trả lời một lần.
    const firstTime =
      typeof messageId !== "string" ||
      (await claimIdempotencyKey(channelIntegration.organizationId, "webhook.zalo", messageId))
    if (body.event_name === "user_send_text" && senderId && messageText && firstTime) {
      let errorCode: string | undefined
      // Trung tâm Tích hợp GĐ3: cấp trên (nền tảng, ngành, chuỗi) đã khoá kênh này → không trả lời, ghi lý do vào nhật ký.
      if (!(await isOwnConnectionAllowed(channelIntegration.organizationId, "zalo_oa"))) errorCode = "LOCKED_BY_UPPER"
      else try {
        const result = await handleIncomingChannelMessage({
          organizationId: channelIntegration.organizationId,
          channel: "ZALO_OA",
          externalSenderId: senderId,
          messageText,
        })

        const accessToken = channelIntegration.config.zaloAccessToken
        if (accessToken && !(await sendZaloOaReply(accessToken, senderId, result.replyText))) errorCode = "REPLY_FAILED"
      } catch (err) {
        console.error("Zalo OA message handling error:", err)
        errorCode = "PROCESSING_FAILED"
      }
      // Nhật ký Trung tâm Tích hợp — không lưu nội dung tin.
      await recordManagedWebhook({
        organizationId: channelIntegration.organizationId,
        connectorKey: "zalo_oa",
        externalAccountId: oaId,
        displayName: "Zalo OA",
        externalEventId: typeof messageId === "string" ? messageId : null,
        eventType: "message",
        ok: !errorCode,
        ...(errorCode ? { errorCode } : {}),
      })
    }

    return NextResponse.json({ error: 0, message: "Success" }, { status: 200 })
  } catch (error) {
    console.error("Zalo OA Webhook error:", error)
    return NextResponse.json({ error: 0, message: "OK" }, { status: 200 })
  }
}

/** true = Zalo nhận tin trả lời (HTTP 2xx và `error` = 0). */
async function sendZaloOaReply(accessToken: string, userId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch("https://openapi.zalo.me/v3.0/oa/message/cs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: accessToken,
      },
      body: JSON.stringify({
        recipient: { user_id: userId },
        message: { text },
      }),
    })
    const body = (await res.json().catch(() => null)) as { error?: number } | null
    return res.ok && (body?.error ?? 0) === 0
  } catch (err) {
    console.error("Failed to send Zalo OA reply:", err)
    return false
  }
}
