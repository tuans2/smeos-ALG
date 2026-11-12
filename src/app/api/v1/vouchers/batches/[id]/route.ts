
import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { voucherBatchActiveBody } from "@/app/api/v1/_contracts/requests-misc"
import { getVoucherBatch, setVoucherBatchActive } from "@/modules/promotions/use-cases/voucher-batches"
import { defineRoute } from "@/core/http/define-route"

type Params = { params: Promise<{ id: string }> }

/** `GET /vouchers/batches/:id` (`Q8`) — đợt + danh sách mã. Đợt của tổ chức khác → 404. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q8" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse(await getVoucherBatch(ctx, id))
  },
})

/** `PATCH /vouchers/batches/:id` (`Q8`) — tạm dừng / mở lại cả đợt. */
export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "Q8" },
  handler: async ({ request, ctx, params }) => {
    const parsed = voucherBatchActiveBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    const { id } = params as { id: string }
    await setVoucherBatchActive(ctx, id, parsed.data.is_active)
    return jsonResponse({ ok: true })
  },
})
