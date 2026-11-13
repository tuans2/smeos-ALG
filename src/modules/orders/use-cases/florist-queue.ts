/**
 * Hàng đợi chế tác — "Việc của tôi" cho Thợ cắm hoa (checklist ALG 4.13, R17) và bảng việc của chi
 * nhánh cho người phân công (R4). Thợ chỉ thấy và báo tiến độ việc đang giao cho chính mình; việc của
 * người khác hoặc ngoài chi nhánh → 404 như không tồn tại.
 */

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { floristNextStatus, toFloristItem, type FloristAction, type FloristItem } from "../domain/florist-work"
import type { DeliveryWindow, ProductionStatus } from "../domain/order-types"
import { FloristQueueRepository } from "../infra/florist-queue-repository"
import { updateOrderProgress } from "./update-order-progress"

export interface FloristWorkView {
  orderId: string
  code: string
  productionStatus: ProductionStatus
  deliveryWindow: DeliveryWindow | null
  cardMessage: string | null
  difficulty: string | null
  assignedAt: string
  assigneeId: string
  assigneeName: string | null
  items: FloristItem[]
}

/** Giờ giao sớm nhất lên trước; đơn chưa hẹn giờ xuống cuối. */
function deliveryKey(w: DeliveryWindow | null): string {
  return w ? `${w.date} ${w.timeSlot ?? ""}` : "~"
}

export async function listFloristQueue(
  ctx: TenantContext,
  scope: "mine" | "team",
  repo = new FloristQueueRepository()
): Promise<FloristWorkView[]> {
  const rows = await repo.listActive(ctx, scope === "mine" ? ctx.userId : null)
  const names = scope === "team" ? await repo.memberNames(ctx, [...new Set(rows.map((r) => r.assignee_id))]) : new Map<string, string>()
  const views = rows.map((r) => {
    const window = (r.order.delivery_window as DeliveryWindow | null) ?? null
    return {
      orderId: r.order.id,
      code: r.order.code,
      productionStatus: r.order.production_status as ProductionStatus,
      deliveryWindow: window,
      cardMessage: r.order.card_message,
      difficulty: r.difficulty,
      assignedAt: r.assigned_at.toISOString(),
      assigneeId: r.assignee_id,
      assigneeName: names.get(r.assignee_id) ?? null,
      items: r.order.items.map(toFloristItem),
    }
  })
  return views.sort((a, b) => deliveryKey(a.deliveryWindow).localeCompare(deliveryKey(b.deliveryWindow)))
}

export async function reportFloristWork(
  ctx: TenantContext,
  orderId: string,
  action: FloristAction,
  repo = new FloristQueueRepository(),
  progress: typeof updateOrderProgress = updateOrderProgress
): Promise<{ productionStatus: ProductionStatus }> {
  const active = await repo.activeForOrder(ctx, orderId)
  if (!active || active.assignee_id !== ctx.userId) {
    throw new AppError("NOT_FOUND", "Không tìm thấy việc chế tác này trong danh sách của bạn.")
  }
  const mine = (await repo.listActive(ctx, ctx.userId)).find((r) => r.order.id === orderId)
  if (!mine) throw new AppError("NOT_FOUND", "Không tìm thấy việc chế tác này trong danh sách của bạn.")
  const next = floristNextStatus(mine.order.production_status as ProductionStatus, action)
  if (!next) {
    throw new AppError("UNPROCESSABLE_ENTITY", action === "START" ? "Việc này đã được nhận trước đó." : "Hãy nhận việc trước khi báo xong.")
  }
  const updated = await progress(ctx, orderId, { productionStatus: next })
  return { productionStatus: updated.productionStatus }
}
