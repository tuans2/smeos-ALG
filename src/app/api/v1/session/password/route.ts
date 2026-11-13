
import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { jsonResponse } from "@/core/http/response"
import { changePasswordBody } from "@/app/api/v1/_contracts/requests-misc"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { changeOwnPassword } from "@/modules/organization/use-cases/staff-accounts"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /session/password` (`A2`): người đang đăng nhập tự đổi mật khẩu (vd. sau khi nhận mật khẩu tạm).
 * Phiên đang dùng giữ nguyên, các máy khác bị đăng xuất.
 */
export const POST = defineRoute({
  auth: { kind: "custom", reason: "giới hạn tần suất trước khi kiểm phiên; phiên + A2 kiểm trong handler" },
  rateLimit: { scope: "password-change", limit: 10, windowMs: 15 * 60_000, per: "ip" },
  handler: async ({ request }) => {
    const { ctx, resolved } = await requireTenantContext(request)
    requireCapability(ctx, "A2")
    const parsed = changePasswordBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    await changeOwnPassword(ctx, {
      currentPassword: parsed.data.current_password,
      newPassword: parsed.data.new_password,
      keepSessionId: resolved.session.id,
    })
    return jsonResponse({ data: { changed: true } })
  },
})
