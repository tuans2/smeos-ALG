import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { branchScopedWhere } from "@/core/tenancy/branch-scope"
import type { ReportPeriod } from "../domain/report-period"
import type { BankEventRow, OrderRow, PaymentRow, ItemRow, AssignmentRow } from "../domain/report-rows"

/**
 * Truy vấn nguồn cho báo cáo (Đợt 5). Mọi truy vấn lọc theo tổ chức của phiên (`scopedWhere`) và phạm vi chi
 * nhánh của người xem (`branchScopedWhere`, 9.13). Kỳ báo cáo đã giới hạn ≤ 366 ngày; số dòng có trần.
 */

const MAX_ROWS = 20_000

function orderScope(ctx: TenantContext) {
  return scopedWhere(ctx, branchScopedWhere(ctx))
}

export async function ordersCreatedIn(ctx: TenantContext, p: ReportPeriod): Promise<OrderRow[]> {
  const rows = await prisma.orders.findMany({
    where: { ...orderScope(ctx), created_at: { gte: p.start, lt: p.end } },
    select: {
      id: true, code: true, status: true, total_vnd: true, paid_vnd: true, created_at: true, delivery_window: true,
      owner_sale_id: true, created_by: true,
      coordination: { select: { estimated_delivery_at: true, shipper_name: true, shipper_phone: true } },
      events: { where: { axis: "delivery", to_value: "DELIVERED" }, select: { created_at: true }, orderBy: { created_at: "asc" }, take: 1 },
    },
    orderBy: { created_at: "asc" },
    take: MAX_ROWS,
  })
  return rows.map((r) => ({
    id: r.id, code: r.code, status: r.status, totalVnd: Number(r.total_vnd), paidVnd: Number(r.paid_vnd), createdAt: r.created_at,
    deliveryWindow: r.delivery_window, saleId: r.owner_sale_id ?? r.created_by,
    estimatedAt: r.coordination?.estimated_delivery_at ?? null,
    shipper: r.coordination?.shipper_phone || r.coordination?.shipper_name ? { phone: r.coordination?.shipper_phone ?? null, name: r.coordination?.shipper_name ?? null } : null,
    deliveredAt: r.events[0]?.created_at ?? null,
  }))
}

export async function paymentsCollectedIn(ctx: TenantContext, p: ReportPeriod): Promise<PaymentRow[]> {
  const rows = await prisma.order_payments.findMany({
    where: { ...scopedWhere(ctx), status: "CONFIRMED", collected_at: { gte: p.start, lt: p.end }, order: branchScopedWhere(ctx) },
    select: { kind: true, amount_vnd: true, payment_method: true, collected_at: true },
    take: MAX_ROWS,
  })
  return rows.map((r) => ({ kind: r.kind, amountVnd: Number(r.amount_vnd), method: r.payment_method, collectedAt: r.collected_at }))
}

/** Giao dịch ngân hàng nhận qua SePay (giao dịch vào tài khoản của tiệm, không thuộc chi nhánh). */
export async function bankEventsIn(ctx: TenantContext, p: ReportPeriod): Promise<BankEventRow[]> {
  const rows = await prisma.greeting_payment_events.findMany({
    where: { ...scopedWhere(ctx), OR: [{ transaction_at: { gte: p.start, lt: p.end } }, { transaction_at: null, created_at: { gte: p.start, lt: p.end } }] },
    select: { id: true, amount_vnd: true, content: true, status: true, transaction_at: true, created_at: true, order_id: true },
    orderBy: { created_at: "desc" },
    take: MAX_ROWS,
  })
  return rows.map((r) => ({ id: r.id, amountVnd: Number(r.amount_vnd), content: r.content, status: r.status, at: r.transaction_at ?? r.created_at, orderId: r.order_id }))
}

export async function itemsOfOrdersIn(ctx: TenantContext, p: ReportPeriod): Promise<ItemRow[]> {
  const rows = await prisma.order_items.findMany({
    where: { ...scopedWhere(ctx), order: { ...branchScopedWhere(ctx), created_at: { gte: p.start, lt: p.end }, status: { not: "CANCELLED" } } },
    select: { product_id: true, description: true, quantity: true, unit_price_vnd: true, fk_product: { select: { name: true, attributes: true } } },
    take: MAX_ROWS,
  })
  return rows.map((r) => ({
    productId: r.product_id, name: r.fk_product?.name ?? r.description ?? "Mẫu ngoài danh mục", quantity: r.quantity,
    unitPriceVnd: Number(r.unit_price_vnd), attributes: r.fk_product?.attributes ?? null,
  }))
}

export async function assignmentsOfOrdersIn(ctx: TenantContext, p: ReportPeriod): Promise<AssignmentRow[]> {
  const rows = await prisma.order_assignments.findMany({
    where: { ...scopedWhere(ctx), released_at: null, order: { ...branchScopedWhere(ctx), created_at: { gte: p.start, lt: p.end } } },
    select: { assignee_id: true, order: { select: { status: true, production_status: true } } },
    take: MAX_ROWS,
  })
  return rows.map((r) => ({ assigneeId: r.assignee_id, orderStatus: r.order.status, productionStatus: r.order.production_status }))
}

/** Tên và số điện thoại thành viên của tổ chức (để hiện tên Sale/thợ/shipper). */
export async function memberDirectory(ctx: TenantContext): Promise<Array<{ userId: string; name: string; phone: string | null }>> {
  const rows = await prisma.memberships.findMany({
    where: scopedWhere(ctx),
    select: { user_id: true, user: { select: { name: true, email: true, phone: true } } },
  })
  return rows.map((r) => ({ userId: r.user_id, name: r.user.name || r.user.email, phone: r.user.phone }))
}

/** Danh sách đơn để xem chi tiết khi bấm vào một số liệu (tối đa 200). */
export async function ordersForDrilldown(ctx: TenantContext, p: ReportPeriod, filter: { cancelled?: boolean }) {
  return prisma.orders.findMany({
    where: { ...orderScope(ctx), created_at: { gte: p.start, lt: p.end }, ...(filter.cancelled === false ? { status: { not: "CANCELLED" } } : {}) },
    select: { id: true, code: true, status: true, total_vnd: true, paid_vnd: true, created_at: true },
    orderBy: { created_at: "desc" },
    take: 200,
  })
}
