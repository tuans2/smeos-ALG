import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { setMemberPhone } from "@/modules/organization/use-cases/staff-accounts"
import { memberPhoneBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

/** `PUT /members/:id/phone` (`A3`) — Điều hành sửa số điện thoại nhân viên (Shipper được gắn đơn qua số này). */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "A3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const parsed = memberPhoneBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await setMemberPhone(ctx, id, parsed.data.phone) })
  },
})
