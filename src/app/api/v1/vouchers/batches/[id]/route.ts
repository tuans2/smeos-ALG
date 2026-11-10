
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { voucherBatchActiveBody } from "@/app/api/v1/_contracts/requests-misc"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getVoucherBatch, setVoucherBatchActive } from "@/modules/promotions/use-cases/voucher-batches"

type Params = { params: Promise<{ id: string }> }

/** `GET /vouchers/batches/:id` (`Q8`) — đợt + danh sách mã. Đợt của tổ chức khác → 404. */
export const GET = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q8")
  const { id } = await context.params
  return jsonResponse(await getVoucherBatch(ctx, id))
})

/** `PATCH /vouchers/batches/:id` (`Q8`) — tạm dừng / mở lại cả đợt. */
export const PATCH = handle(async (request, context: Params) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q8")
  const parsed = voucherBatchActiveBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const { id } = await context.params
  await setVoucherBatchActive(ctx, id, parsed.data.is_active)
  return jsonResponse({ ok: true })
})
