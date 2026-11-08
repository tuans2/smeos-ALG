/**
 * Use-case: Update Order Progress (Cập nhật tiến độ sản xuất & đơn hàng — M10, R3).
 */

import { AppError } from "@/core/http/errors"
import { inBranchScope } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { brochureLockReason, manualStatusBlockReason } from "../domain/order-rules"
import { checkLifecycleTransition } from "../domain/order-lifecycle"
import type { OrderRecord, UpdateOrderInput } from "../domain/order-types"
import type { IOrderRepository, PendingOrderEvent } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"

export async function updateOrderProgress(
  ctx: TenantContext,
  orderId: string,
  input: UpdateOrderInput,
  repo: IOrderRepository = getOrderRepository(),
  notify: typeof notifyOrganization = notifyOrganization
): Promise<OrderRecord> {
  const existing = await repo.findById(ctx.organizationId, orderId)
  // Ngoài chi nhánh được giao → như không tồn tại (checklist ALG 9.13)
  if (!existing || !inBranchScope(ctx, existing.branchId)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }

  const brochureLock = brochureLockReason(existing)
  if (brochureLock) throw new AppError("CONFLICT", brochureLock)

  if (input.status && input.status !== existing.status) {
    const blocked = manualStatusBlockReason(input.status)
    if (blocked) throw new AppError("UNPROCESSABLE_ENTITY", blocked)
  }

  // Một hàm kiểm cho bộ ba trục, chung với Điều phối (audit BL-03)
  const check = checkLifecycleTransition(
    { status: existing.status, productionStatus: existing.productionStatus, deliveryStatus: existing.deliveryStatus },
    {
      status: input.status ?? existing.status,
      productionStatus: input.productionStatus ?? existing.productionStatus,
      deliveryStatus: input.deliveryStatus ?? existing.deliveryStatus,
    }
  )
  if (!check.valid) throw new AppError("UNPROCESSABLE_ENTITY", check.reason)

  // Sự kiện thay đổi ghi cùng giao dịch với cập nhật (audit BL-18)
  const events: PendingOrderEvent[] = []
  const actorId = ctx.userId
  if (input.status && input.status !== existing.status) {
    events.push({ axis: "order", fromValue: existing.status, toValue: input.status, actorId, reason: "Cập nhật trạng thái đơn hàng" })
  }
  if (input.productionStatus && input.productionStatus !== existing.productionStatus) {
    events.push({ axis: "production", fromValue: existing.productionStatus, toValue: input.productionStatus, actorId, reason: "Cập nhật tiến độ chế tác" })
  }
  if (input.deliveryStatus && input.deliveryStatus !== existing.deliveryStatus) {
    events.push({ axis: "delivery", fromValue: existing.deliveryStatus, toValue: input.deliveryStatus, actorId, reason: "Cập nhật tiến độ giao hàng" })
  }

  const updated = await repo.update(ctx.organizationId, orderId, input, events)
  for (const eventKey of progressEvents(existing, input)) {
    // Không chờ: thông báo lỗi không làm hỏng việc cập nhật đơn
    void notify({
      organizationId: ctx.organizationId,
      eventKey,
      ownerUserId: existing.createdBy ?? null,
      message: `Đơn ${existing.code}: ${PROGRESS_TEXT[eventKey]}.`,
    })
  }
  return updated
}

const PROGRESS_TEXT: Record<string, string> = {
  ORDER_ACCEPTED: "đã xác nhận",
  PRODUCT_READY_FOR_DELIVERY: "đã chế tác xong, sẵn sàng giao",
  ORDER_DELIVERED: "đã giao thành công",
}

/** Sự kiện thông báo sinh ra khi tiến độ đơn đổi sang một mốc đáng báo. */
export function progressEvents(existing: OrderRecord, input: UpdateOrderInput): string[] {
  const events: string[] = []
  if (input.status === "CONFIRMED" && existing.status !== "CONFIRMED") events.push("ORDER_ACCEPTED")
  if (input.productionStatus === "READY" && existing.productionStatus !== "READY") events.push("PRODUCT_READY_FOR_DELIVERY")
  const delivered =
    (input.status === "DELIVERED" && existing.status !== "DELIVERED") ||
    (input.deliveryStatus === "DELIVERED" && existing.deliveryStatus !== "DELIVERED")
  if (delivered) events.push("ORDER_DELIVERED")
  return events
}
