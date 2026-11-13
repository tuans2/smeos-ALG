/**
 * Theo dõi đơn thiếu thông tin (checklist ALG 4.14): đơn thiếu địa chỉ, SĐT người nhận hoặc lời chúc
 * (đơn có thiệp) tự sinh yêu cầu bổ sung; đủ thông tin thì yêu cầu tự đóng; quá hạn thì chuyển "Quá hạn"
 * và nhắc người tạo đơn. Người xử lý cũng tạo yêu cầu tay (trường bất kỳ, hỏi ai, hạn) hoặc huỷ.
 */

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import {
  AUTO_INFO_FIELDS, DEFAULT_INFO_DUE_MINUTES, OPEN_INFO_STATUSES, isAutoInfoField, isInfoRequestOverdue, missingInfoFields,
} from "../domain/order-info-gaps"
import { OrderInfoRequestRepository, type InfoRequestRow } from "../infra/order-info-request-repository"

export interface InfoRequestView {
  id: string
  orderId: string
  orderCode: string
  field: string
  label: string
  reason: string
  requestedFrom: string
  requestedBy: string
  requestedAt: string
  dueAt: string | null
  status: string
  responseValue: string | null
  cancelledReason: string | null
}

const toView = (r: InfoRequestRow): InfoRequestView => ({
  id: r.id, orderId: r.order_id, orderCode: r.order.code, field: r.missing_field, label: r.field_label, reason: r.reason,
  requestedFrom: r.requested_from, requestedBy: r.requested_by, requestedAt: r.requested_at.toISOString(), dueAt: r.due_at?.toISOString() ?? null,
  status: r.status, responseValue: r.response_value, cancelledReason: r.cancelled_reason,
})

const notFound = () => new AppError("NOT_FOUND", "Không tìm thấy đơn hàng.")

/** Đồng bộ yêu cầu tự sinh với dữ liệu hiện tại của đơn, rồi trả danh sách yêu cầu của đơn. */
export async function syncOrderInfoRequests(
  ctx: TenantContext,
  orderId: string,
  now = new Date(),
  repo = new OrderInfoRequestRepository(),
  notify: typeof notifyOrganization = notifyOrganization
): Promise<InfoRequestView[]> {
  const order = await repo.orderFacts(ctx, orderId)
  if (!order) throw notFound()
  const ended = order.status === "CANCELLED" || order.status === "COMPLETED"
  const missing = ended
    ? []
    : missingInfoFields({
        deliveryAddress: order.delivery_address,
        coordinationMeta: order.coordination?.metadata ?? null,
        cardMessage: order.card_message,
        cardRequired: order.coordination?.card_required ?? false,
      })
  let rows = await repo.listForOrder(ctx, orderId)
  const open = rows.filter((r) => (OPEN_INFO_STATUSES as readonly string[]).includes(r.status))

  for (const field of missing) {
    if (open.some((r) => r.missing_field === field)) continue
    await repo.create(ctx, {
      orderId, field, label: AUTO_INFO_FIELDS[field], reason: `Đơn chưa có ${AUTO_INFO_FIELDS[field].toLowerCase()}`,
      requestedFrom: "Khách đặt hàng", dueAt: new Date(now.getTime() + DEFAULT_INFO_DUE_MINUTES * 60_000),
    })
  }
  for (const r of open) {
    if (isAutoInfoField(r.missing_field) && !missing.includes(r.missing_field)) {
      await repo.setStatus(ctx, r.id, OPEN_INFO_STATUSES, { status: "RECEIVED", response_received_at: now })
    } else if (isInfoRequestOverdue(r.status, r.due_at, now)) {
      if ((await repo.setStatus(ctx, r.id, ["OPEN", "SENT", "WAITING"], { status: "OVERDUE" })) > 0) {
        void notify({
          organizationId: ctx.organizationId, eventKey: "ORDER_INFO_REQUEST_OVERDUE", ownerUserId: r.requested_by,
          message: `Đơn ${r.order.code}: quá hạn bổ sung ${r.field_label.toLowerCase()}.`, deepLink: "/don-hang",
        })
      }
    }
  }
  rows = await repo.listForOrder(ctx, orderId)
  return rows.map(toView)
}

export async function createOrderInfoRequest(
  ctx: TenantContext,
  orderId: string,
  input: { field: string; label: string; reason: string; requestedFrom: string; dueAt: Date | null; channel?: string | null },
  repo = new OrderInfoRequestRepository()
): Promise<InfoRequestView> {
  const order = await repo.orderFacts(ctx, orderId)
  if (!order) throw notFound()
  if (order.status === "CANCELLED" || order.status === "COMPLETED") {
    throw new AppError("UNPROCESSABLE_ENTITY", "Đơn đã kết thúc, không tạo yêu cầu bổ sung.")
  }
  return toView(await repo.create(ctx, { orderId, ...input }))
}

/** Đóng tay một yêu cầu: đã nhận câu trả lời (`RECEIVED`) hoặc huỷ (`CANCELLED`, bắt buộc lý do). */
export async function closeOrderInfoRequest(
  ctx: TenantContext,
  orderId: string,
  requestId: string,
  input: { outcome: "RECEIVED" | "CANCELLED"; note?: string | undefined },
  now = new Date(),
  repo = new OrderInfoRequestRepository()
): Promise<void> {
  if (!(await repo.orderFacts(ctx, orderId))) throw notFound()
  if (!(await repo.listForOrder(ctx, orderId)).some((r) => r.id === requestId)) throw new AppError("NOT_FOUND", "Không tìm thấy yêu cầu bổ sung.")
  const note = input.note?.trim() || null
  if (input.outcome === "CANCELLED" && !note) throw new AppError("VALIDATION_FAILED", "Huỷ yêu cầu phải ghi lý do.", { note: "Bắt buộc" })
  const data = input.outcome === "RECEIVED"
    ? { status: "RECEIVED" as const, response_value: note, response_received_at: now }
    : { status: "CANCELLED" as const, cancelled_reason: note }
  if ((await repo.setStatus(ctx, requestId, OPEN_INFO_STATUSES, data)) === 0) {
    throw new AppError("CONFLICT", "Yêu cầu này đã đóng.")
  }
}

/** Việc "Thiếu thông tin" của tổ chức: mọi yêu cầu còn mở, hạn gần nhất lên trước. */
export async function listOpenInfoRequests(ctx: TenantContext, now = new Date(), repo = new OrderInfoRequestRepository()): Promise<InfoRequestView[]> {
  // Đồng bộ lại từng đơn đang có yêu cầu mở: đơn đã đủ thông tin thì đóng, quá hạn thì đánh dấu và nhắc
  const orderIds = [...new Set((await repo.listOpen(ctx)).map((r) => r.order_id))]
  for (const orderId of orderIds) await syncOrderInfoRequests(ctx, orderId, now, repo)
  return (await repo.listOpen(ctx)).map(toView)
}
