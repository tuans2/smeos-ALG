import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { requestOrganizationUpgrade } from "@/modules/organization/use-cases/request-organization-upgrade"
import { upgradeRequestBody } from "@/app/api/v1/_contracts/requests-org"
import { defineRoute } from "@/core/http/define-route"

/**
 * `POST /organizations/current/upgrade-request` (`F2`, cùng năng lực với
 * `PATCH /organizations/current` — đây cũng là một thay đổi ở cấp tổ chức).
 * Xem `request-organization-upgrade.ts` vì sao endpoint này chỉ GHI NHẬN
 * yêu cầu, không tự chuyển đổi tổ chức ngay.
 */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const parsed = upgradeRequestBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    const result = await requestOrganizationUpgrade(ctx, {
      requestedType: parsed.data.requested_type,
      note: parsed.data.note ?? null,
    })

    return jsonResponse(result, { status: 201 })
  },
})
