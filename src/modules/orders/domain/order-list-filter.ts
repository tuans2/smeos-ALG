/**
 * Lọc nâng cao danh sách đơn (checklist ALG 4.3): khoảng ngày giao, nhân viên bán, chi nhánh — dùng
 * chung cho đơn Thẻ Chào và đơn đa nguồn. Trả điều kiện dạng đối tượng thuần (không import Prisma).
 *
 * Ngày giao: đơn Thẻ Chào/đa nguồn ghi `delivery_window.date` (YYYY-MM-DD); đơn Điều phối ghi giờ
 * hẹn ở `order_coordinations.estimated_delivery_at` — so theo ngày giờ Việt Nam.
 */

export interface OrderListExtraFilter {
  deliveryFrom?: string | undefined
  deliveryTo?: string | undefined
  /** Chỉ dùng cho người xem toàn tiệm; Sale "chỉ khách của mình" đã bị giới hạn ở tầng trên. */
  saleId?: string | undefined
  /** Lọc chi nhánh người xem chọn; người bị giới hạn chi nhánh vẫn chỉ thấy chi nhánh mình. */
  branchId?: string | undefined
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Ngày hợp lệ dạng YYYY-MM-DD, hoặc `undefined`. */
export function parseDeliveryDate(raw: string | null | undefined): string | undefined {
  const v = raw?.trim()
  return v && DATE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00+07:00`)) ? v : undefined
}

/** Điều kiện ngày giao; `{}` khi không lọc. */
export function deliveryDateWhere(from: string | undefined, to: string | undefined): Record<string, unknown> {
  if (!from && !to) return {}
  const windowDate = [
    ...(from ? [{ delivery_window: { path: ["date"], gte: from } }] : []),
    ...(to ? [{ delivery_window: { path: ["date"], lte: to } }] : []),
  ]
  const target: Record<string, Date> = {}
  if (from) target.gte = new Date(`${from}T00:00:00+07:00`)
  if (to) target.lte = new Date(`${to}T23:59:59.999+07:00`)
  return { OR: [{ AND: windowDate }, { coordination: { is: { estimated_delivery_at: target } } }] }
}

/** Điều kiện nhân viên bán của đơn đa nguồn: Sale phụ trách, hoặc người tạo khi đơn chưa gán Sale. */
export function multiSourceSaleWhere(saleId: string | undefined): Record<string, unknown> {
  return saleId ? { OR: [{ owner_sale_id: saleId }, { owner_sale_id: null, created_by: saleId }] } : {}
}

/** Gộp các điều kiện lọc nâng cao thành một khối `AND` (không đụng khoá `OR` của truy vấn gốc). */
export function orderListExtraWhere(
  filter: OrderListExtraFilter,
  saleWhere: (saleId: string | undefined) => Record<string, unknown> = () => ({})
): { AND: Record<string, unknown>[] } {
  const parts = [
    deliveryDateWhere(filter.deliveryFrom, filter.deliveryTo),
    filter.branchId ? { branch_id: filter.branchId } : {},
    saleWhere(filter.saleId),
  ].filter((p) => Object.keys(p).length > 0)
  return { AND: parts }
}
