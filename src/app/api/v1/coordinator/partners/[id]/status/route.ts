import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { changePartnershipStatus } from "@/modules/chain-partnership/use-cases/manage-chain-links"
import { partnershipStatusBody } from "@/app/api/v1/_contracts/requests-coordinator"
import { defineRoute } from "@/core/http/define-route"

/**
 * `PATCH /coordinator/partners/:id/status` (F2) — Chuỗi tạm ngưng / mở lại / chấm dứt liên kết, hoặc rút lời mời.
 * Theo ma trận vòng đời (UJ-10): không tự kích hoạt lời mời thay cửa hàng, đã chấm dứt thì không mở lại; bắt buộc
 * lý do, ghi nhật ký, báo cửa hàng. Chuỗi khác → 404.
 */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx, params }) => {
    const { id: partnershipId } = params as { id: string }
    const parsed = partnershipStatusBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      throw validationFailed({ reason: parsed.error.issues.map((e) => e.message).join(", ") })
    }
    const updated = await changePartnershipStatus(ctx, partnershipId, parsed.data.status, parsed.data.reason ?? "")
    return jsonResponse({ success: true, data: updated })
  },
})
