/**
 * Use-case: Cancel Order (Hủy đơn hàng — M10, R6).
 * Gác bởi trần cứng điều hành, bắt buộc lý do, ghi audit_logs.
 */

import { brochureLockReason } from "../domain/order-rules"
import { inBranchScope } from "@/core/tenancy"
import { AppError } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { OrderRecord } from "../domain/order-types"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"
import { returnStock } from "../infra/order-stock"
import { releaseOrderBookings } from "@/modules/availability/infra/order-booking-hold"
import { releaseLeadOfCancelledOrder } from "../infra/order-lead-link"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { orderCoordinationPort, type OrderCoordinationPort } from "@/modules/coordinator/use-cases/order-coordination-port"

export async function cancelOrder(
  ctx: TenantContext,
  orderId: string,
  reason: string,
  repo: IOrderRepository = getOrderRepository(),
  notify: typeof notifyOrganization = notifyOrganization,
  coordination: OrderCoordinationPort = orderCoordinationPort,
  releaseStock: typeof returnStock = returnStock,
  releaseLead: typeof releaseLeadOfCancelledOrder = releaseLeadOfCancelledOrder,
  releaseBookings: typeof releaseOrderBookings = releaseOrderBookings
): Promise<OrderRecord> {
  // Gác quyền R6 (Trần cứng)
  requireCapability(ctx, "R6")

  if (!reason || reason.trim().length === 0) {
    throw new AppError("VALIDATION_FAILED", "Hủy đơn hàng bắt buộc phải có lý do chi tiết.")
  }

  const existing = await repo.findById(ctx.organizationId, orderId)
  // Ngoài chi nhánh được giao → như không tồn tại (checklist ALG 9.13)
  if (!existing || !inBranchScope(ctx, existing.branchId)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }

  const brochureLock = brochureLockReason(existing)
  if (brochureLock) throw new AppError("CONFLICT", brochureLock)

  if (existing.status === "CANCELLED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Đơn hàng này đã bị hủy trước đó.")
  }

  if (existing.status === "COMPLETED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Không thể hủy đơn hàng đã hoàn tất giao dịch.")
  }

  // Một luật với máy trạng thái M10 và Điều phối (audit BL-04): hàng đã tới tay người nhận thì mở sự cố, không huỷ.
  if (existing.status === "DELIVERED" || existing.deliveryStatus === "DELIVERED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Đơn đã giao tới người nhận — không huỷ được, hãy mở sự cố ở màn Điều phối.")
  }

  let updated: OrderRecord
  if (await coordination.isUnderCoordination(ctx, orderId)) {
    // Đơn đang ở Điều phối: huỷ qua Điều phối để bước điều phối, ba trục và sự kiện đổi cùng một giao dịch
    await coordination.cancel(ctx, orderId, reason)
    const after = await repo.findById(ctx.organizationId, orderId)
    if (!after) throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
    updated = after
  } else {
    // Sự kiện huỷ + đổi trạng thái: một giao dịch (audit BL-18)
    updated = await repo.update(ctx.organizationId, orderId, { status: "CANCELLED" }, [
      { axis: "order", fromValue: existing.status, toValue: "CANCELLED", actorId: ctx.userId, reason },
    ])
    // Hoàn tồn đã trừ lúc tạo đơn (Q9); đơn ở Điều phối được hoàn trong `cancelCoordinatorOrder`
    await releaseStock(ctx.organizationId, orderId)
    // Trả lịch đặt chỗ của đơn (audit User Journey UJ-23); đơn ở Điều phối được trả trong `cancelCoordinatorOrder`
    await releaseBookings(ctx.organizationId, orderId)
    // Lead gắn với đơn về "Theo dõi"; đơn ở Điều phối được xử lý trong `cancelCoordinatorOrder` (UJ-13)
    await releaseLead(ctx.organizationId, orderId)
  }

  // Ghi audit log
  await recordAuditLog(ctx, {
    action: "order.cancel",
    entityType: "orders",
    entityId: orderId,
    before: { status: existing.status },
    after: { status: "CANCELLED", reason },
  })

  void notify({
    organizationId: ctx.organizationId,
    eventKey: "ORDER_CANCELLED",
    ownerUserId: existing.createdBy ?? null,
    message: `Đơn ${existing.code} đã bị huỷ.`,
    deepLink: "/don-hang",
  })

  return updated
}
