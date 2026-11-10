
import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { createVoucherBatchBody } from "@/app/api/v1/_contracts/requests-misc"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { issueVoucherBatch, listVoucherBatches } from "@/modules/promotions/use-cases/voucher-batches"

/**
 * `GET · POST /vouchers/batches` (`Q8`) — Phát hành mã giảm giá: danh sách đợt và tạo đợt mới.
 * Kèm danh sách ưu đãi đang bật + trần % để màn hình chọn — cùng nguồn với ma trận ưu đãi.
 */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q8")
  return jsonResponse(await listVoucherBatches(ctx))
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "Q8")

  const parsed = createVoucherBatchBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  const d = parsed.data
  const batch = await issueVoucherBatch(ctx, {
    name: d.name,
    mode: d.mode,
    sharedCode: d.shared_code ?? null,
    codePrefix: d.code_prefix ?? null,
    quantity: d.mode === "SHARED" ? 1 : d.quantity ?? 0,
    promotionId: d.promotion_id ?? null,
    discountType: d.discount_type,
    discountValue: d.discount_value,
    minOrderVnd: d.min_order_vnd ?? 0,
    maxDiscountVnd: d.max_discount_vnd ?? null,
    startsAt: d.starts_at ? new Date(d.starts_at) : null,
    expiresAt: d.expires_at ? new Date(d.expires_at) : null,
    usageLimit: d.usage_limit ?? null,
    perCustomerLimit: d.per_customer_limit ?? null,
  })
  return jsonResponse(batch, { status: 201 })
})
