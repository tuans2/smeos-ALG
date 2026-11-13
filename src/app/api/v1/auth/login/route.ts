import { serializeSessionCookie, serializeSsoCookie } from "@/core/http/cookies"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { normalizeEmail } from "@/modules/organization/domain/credentials"
import { SESSION_TTL_SECONDS } from "@/modules/organization/domain/session-policy"
import { logIn } from "@/modules/organization/use-cases/log-in"
import { ssoClaimsFor, SSO_TOKEN_TTL_SECONDS } from "@/modules/sso/domain/sso-claims"
import { signSsoToken } from "@/modules/sso/infra/sso-jwt"
import { loginBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

export const POST = defineRoute({
  auth: { kind: "custom", reason: "đăng nhập — chưa có phiên; giới hạn theo IP và email trong handler" },
  handler: async ({ request }) => {
    const parsed = loginBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    // Chặn dò mật khẩu (PO 08/10/2026): theo email (10 lần/15 phút) và theo IP (40 lần/15 phút —
    // cả tiệm dùng chung wifi vẫn đủ cho mọi người đăng nhập đầu ca)
    await enforceRateLimit(request, { scope: "login-ip", limit: 40, windowMs: 15 * 60_000 })
    await enforceRateLimit(request, { scope: "login-email", limit: 10, windowMs: 15 * 60_000, subject: normalizeEmail(parsed.data.email) })

    const result = await logIn(parsed.data)

    // B1 (Unified Shell) — phát hành thêm JWT liên-app bên cạnh cookie phiên
    // hiện có. Hai cookie khác vai trò: `floraos_session` chỉ floraos-core tự
    // đọc (tra CSDL, thu hồi được); `floraos_sso` là thứ LocalBudd/SocialFlow
    // xác minh tại chỗ, sống ngắn (xem `modules/sso/domain/sso-claims.ts`).
    const ssoToken = signSsoToken(
      ssoClaimsFor({
        userId: result.userId,
        organizationId: result.organizationId,
        email: result.email,
        now: new Date(),
      })
    )

    return jsonResponse(
      { user_id: result.userId, organization_id: result.organizationId },
      {
        headers: {
          "set-cookie": [
            serializeSessionCookie(result.token, SESSION_TTL_SECONDS),
            serializeSsoCookie(ssoToken, SSO_TOKEN_TTL_SECONDS),
          ],
        },
      }
    )
  },
})
