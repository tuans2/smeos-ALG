import { jsonResponse } from "@/core/http/response"
import { resetMemberPassword } from "@/modules/organization/use-cases/staff-accounts"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /members/:id/reset-password` (`A7`, trần cứng Điều hành): cấp mật khẩu tạm mới, đăng xuất nhân
 * viên ở mọi máy. Thành viên tiệm khác → 404.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "A7" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ data: await resetMemberPassword(ctx, id) }, { headers: { "cache-control": "no-store" } })
  },
})
