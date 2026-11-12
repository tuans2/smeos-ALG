import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { handlePlatformSepay } from "@/modules/subscription/use-cases/sepay-platform-webhook"
import { sepayPlatformWebhookBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

function apiKeyFrom(request: Request): string | null {
  const m = /^apikey\s+(\S+)$/i.exec((request.headers.get("authorization") ?? "").trim())
  return m?.[1] ?? null
}

/**
 * POST /api/v1/billing/sepay — SePay báo giao dịch vào tài khoản nhận tiền thuê bao của nền tảng
 * (checklist ALG 10.7). Xác thực `Authorization: Apikey <SEPAY_PLATFORM_API_KEY>`; chưa cấu hình khoá → 404.
 */
export const POST = defineRoute({
  auth: { kind: "custom", reason: "webhook SePay nền tảng — khoá API kiểm trong use-case (handlePlatformSepay)" },
  rateLimit: { scope: "sepay-platform-webhook", limit: 600, windowMs: 60_000, per: "ip" },
  handler: async ({ request }) => {
    const parsed = sepayPlatformWebhookBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ body: "Dữ liệu webhook không hợp lệ" })
    const result = await handlePlatformSepay(apiKeyFrom(request), parsed.data)
    return jsonResponse({ success: true, ...result })
  },
})

export const dynamic = "force-dynamic"
