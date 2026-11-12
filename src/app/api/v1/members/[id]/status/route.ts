import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { setMemberActive } from "@/modules/organization/use-cases/staff-accounts"
import { memberStatusBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

/** `PATCH /members/:id/status` (`A5`, trần cứng Điều hành): tạm khoá (đăng xuất ngay) hoặc mở lại tài khoản. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "A5" },
  handler: async ({ request, ctx, params }) => {
    const parsed = memberStatusBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    return jsonResponse({ data: await setMemberActive(ctx, id, parsed.data.active) })
  },
})
