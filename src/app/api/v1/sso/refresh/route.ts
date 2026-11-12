import { serializeSsoCookie } from "@/core/http/cookies"
import { handle, jsonResponse } from "@/core/http/response"
import { resolveSession } from "@/modules/organization/use-cases/resolve-session"
import { ssoClaimsFor, SSO_TOKEN_TTL_SECONDS } from "@/modules/sso/domain/sso-claims"
import { signSsoToken } from "@/modules/sso/infra/sso-jwt"

/**
 * B1 (Unified Shell) — điểm làm mới cho JWT liên-app ngắn hạn (15 phút,
 * quyết định của anh Tony, AskUserQuestion 2026-09-10). Gọi SERVER-TO-SERVER
 * từ backend của `LocalBudd`/`SocialFlow`, không gọi trực tiếp từ trình
 * duyệt của người dùng cuối — cookie phiên gốc (`smeos_session`) là
 * `HttpOnly` nên JS phía trình duyệt vốn không đọc được nó để tự gửi kèm.
 *
 * Luồng: trình duyệt gửi request tới LocalBudd/SocialFlow → cookie
 * `smeos_session` tự đi kèm (host-only "localhost"/domain cha, không phân
 * biệt cổng hay path — xem `core/http/cookies.ts`) → backend của app đó đọc
 * cookie này từ request nó nhận, forward nguyên văn làm header `Cookie` khi
 * gọi route này → route xác thực lại bằng chính `resolveSession()` dùng cho
 * mọi endpoint khác của floraos-core (không có đường tắt) → trả JWT mới.
 * App gọi tự đặt `Set-Cookie` `smeos_sso` mới trong ĐÁP ỨNG CỦA CHÍNH NÓ
 * cho trình duyệt — `Set-Cookie` ở đáp ứng server-to-server này không tới
 * được trình duyệt gốc, nên giá trị JWT trả cả trong JSON để app gọi tự làm
 * việc đó.
 */
export const POST = handle(async (request) => {
  const resolved = await resolveSession(request)

  const claims = ssoClaimsFor({
    userId: resolved.user.id,
    organizationId: resolved.session.organization_id,
    email: resolved.user.email,
    now: new Date(),
  })
  const ssoToken = signSsoToken(claims)

  return jsonResponse(
    { sso_token: ssoToken, expires_at: claims.exp },
    { headers: { "set-cookie": serializeSsoCookie(ssoToken, SSO_TOKEN_TTL_SECONDS) } }
  )
})
