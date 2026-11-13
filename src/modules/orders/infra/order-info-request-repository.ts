/** Yêu cầu bổ sung thông tin đơn (`order_info_requests`, checklist ALG 4.14). Mọi truy vấn lọc theo tổ chức. */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { OPEN_INFO_STATUSES } from "../domain/order-info-gaps"

export const INFO_REQUEST_LIST_MAX = 100

const SELECT = {
  id: true, order_id: true, missing_field: true, field_label: true, reason: true, requested_from: true, requested_by: true,
  requested_at: true, due_at: true, status: true, response_value: true, response_received_at: true, cancelled_reason: true,
  order: { select: { code: true } },
} as const

export type InfoRequestRow = Awaited<ReturnType<OrderInfoRequestRepository["listForOrder"]>>[number]

export class OrderInfoRequestRepository {
  /** Đơn trong phạm vi người xem (tổ chức + chi nhánh), kèm dữ liệu để dò trường thiếu. */
  async orderFacts(ctx: TenantContext, orderId: string) {
    return prisma.orders.findFirst({
      where: scopedWhere(ctx, { id: orderId, ...branchScopedWhere(ctx) }),
      select: { id: true, status: true, delivery_address: true, card_message: true, coordination: { select: { metadata: true, card_required: true } } },
    })
  }

  async listForOrder(ctx: TenantContext, orderId: string) {
    return prisma.order_info_requests.findMany({ where: scopedWhere(ctx, { order_id: orderId }), orderBy: { requested_at: "asc" }, select: SELECT })
  }

  /** Mọi yêu cầu còn mở của tổ chức (Hộp việc "Thiếu thông tin"). */
  async listOpen(ctx: TenantContext) {
    return prisma.order_info_requests.findMany({
      where: scopedWhere(ctx, { status: { in: [...OPEN_INFO_STATUSES] }, order: { ...branchScopedWhere(ctx) } }),
      orderBy: { due_at: "asc" },
      take: INFO_REQUEST_LIST_MAX,
      select: SELECT,
    })
  }

  async create(
    ctx: TenantContext,
    input: { orderId: string; field: string; label: string; reason: string; requestedFrom: string; dueAt: Date | null; channel?: string | null }
  ) {
    return prisma.order_info_requests.create({
      data: scopedData(ctx, {
        order_id: input.orderId, missing_field: input.field, field_label: input.label, reason: input.reason,
        requested_from: input.requestedFrom, requested_by: ctx.userId, due_at: input.dueAt, channel: input.channel ?? null,
      }),
      select: SELECT,
    })
  }

  /** Đổi trạng thái một yêu cầu của tổ chức; trả số dòng đổi (0 = không thuộc tổ chức / đã đóng). */
  async setStatus(
    ctx: TenantContext,
    id: string,
    fromStatuses: readonly string[],
    data: { status: "RECEIVED" | "CANCELLED" | "OVERDUE"; response_value?: string | null; response_received_at?: Date; cancelled_reason?: string | null }
  ): Promise<number> {
    const res = await prisma.order_info_requests.updateMany({
      where: scopedWhere(ctx, { id, status: { in: [...fromStatuses] as never } }),
      data,
    })
    return res.count
  }
}
