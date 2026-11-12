import { AppError } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { inBranchScope } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { deliveryWindowChangeEvent } from "../domain/delivery-window-change"
import { brochureLockReason } from "../domain/order-rules"
import type { DeliveryWindow, OrderRecord } from "../domain/order-types"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"

/**
 * `PATCH /orders/:id/delivery-window` (`R21`, PO 11/11/2026): đổi giờ giao kèm lý do; lịch sử đơn giữ giá trị cũ/mới,
 * người đổi, thời điểm (checklist ALG 4.6). Người không có quyền Sửa đơn (`R3`, ví dụ Sale) chỉ đổi được đơn mình
 * tạo — đơn khác như không tồn tại. Đơn Thẻ Chào đổi ở luồng Thẻ Chào (`brochureLockReason`).
 */
export async function changeDeliveryWindow(
  ctx: TenantContext,
  orderId: string,
  input: { window: DeliveryWindow; reason: string },
  repo: IOrderRepository = getOrderRepository()
): Promise<OrderRecord> {
  const existing = await repo.findById(ctx.organizationId, orderId)
  const own = existing?.createdBy === ctx.userId
  if (!existing || !inBranchScope(ctx, existing.branchId) || (!ctx.capabilities.has("R3") && !own)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }
  const lock = brochureLockReason(existing)
  if (lock) throw new AppError("CONFLICT", lock)
  const reason = input.reason.trim()
  if (reason.length < 3) throw new AppError("VALIDATION_FAILED", "Cần ghi lý do đổi giờ giao")
  const event = deliveryWindowChangeEvent(existing.deliveryWindow, input.window, ctx.userId, reason)
  if (!event) return existing
  const updated = await repo.update(ctx.organizationId, orderId, { deliveryWindow: input.window }, [event])
  await recordAuditLog(ctx, {
    action: "order.delivery_window.update",
    entityType: "orders",
    entityId: orderId,
    before: { deliveryWindow: existing.deliveryWindow },
    after: { deliveryWindow: input.window, reason },
  })
  return updated
}
