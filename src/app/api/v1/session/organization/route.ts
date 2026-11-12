
import { serializeSsoCookie } from "@/core/http/cookies"
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { switchOrganizationBody } from "@/app/api/v1/_contracts/requests-misc"
import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { switchOrganization } from "@/modules/organization/use-cases/switch-organization"
import { ssoClaimsFor, SSO_TOKEN_TTL_SECONDS } from "@/modules/sso/domain/sso-claims"
import { signSsoToken } from "@/modules/sso/infra/sso-jwt"
import { defineRoute } from "@/core/http/define-route"

/**
 * Chỗ duy nhất trong toàn bộ API mà client được nêu tên một tổ chức. Mọi
 * endpoint khác lấy tổ chức từ `sessions.organization_id` phía máy chủ.
 */
export const POST = defineRoute({
  auth: { kind: "custom", reason: "đổi tổ chức — phiên kiểm bằng resolveSession, thành viên kiểm trong use-case" },
  handler: async ({ request }) => {
    const resolved = await resolveSession(request)
    const parsed = switchOrganizationBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const organization = await switchOrganization({
      userId: resolved.user.id,
      sessionId: resolved.session.id,
      organizationId: parsed.data.organization_id,
    })

    // B1 (Unified Shell) — JWT liên-app mang `org` bên trong nó (không tra lại
    // mỗi request), nên đổi tổ chức đang hoạt động phải phát hành JWT MỚI ngay,
    // chứ không đợi hết hạn 15 phút rồi mới đúng — nếu không, LocalBudd/
    // SocialFlow vẫn thấy tổ chức CŨ cho tới khi JWT cũ hết hạn tự nhiên.
    const ssoToken = signSsoToken(
      ssoClaimsFor({
        userId: resolved.user.id,
        organizationId: organization.id,
        email: resolved.user.email,
        now: new Date(),
      })
    )

    return jsonResponse(
      { organization },
      { headers: { "set-cookie": serializeSsoCookie(ssoToken, SSO_TOKEN_TTL_SECONDS) } }
    )
  },
})
