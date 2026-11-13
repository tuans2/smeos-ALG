import { deliveryDeadline, ratio } from "./report-period"
import type { AssignmentRow, ItemRow, OrderRow } from "./report-rows"

/**
 * Báo cáo sản phẩm (6.3) và hiệu suất (6.5) — luật thuần.
 * Sản phẩm: xếp hạng theo số lượng và giá trị; tỷ trọng màu chủ đạo (`attributes.mainColor`/`color`) và phong
 * cách (`attributes.style`/`craftStyle`) theo số lượng bán. Hiệu suất: doanh số theo Sale (đơn chưa huỷ), sản
 * lượng theo thợ (việc đang giao, đã xong khi đơn sẵn sàng/đã giao/hoàn tất), giao đúng giờ theo shipper.
 */

const attr = (a: unknown, ...keys: string[]): string | null => {
  const o = a && typeof a === "object" ? (a as Record<string, unknown>) : {}
  for (const k of keys) {
    const v = o[k]
    if (typeof v === "string" && v.trim()) return v.trim()
  }
  return null
}

function shares(entries: Array<[string | null, number]>) {
  const map = new Map<string, number>()
  let total = 0
  for (const [k, q] of entries) {
    if (!k) continue
    map.set(k, (map.get(k) ?? 0) + q)
    total += q
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, quantity]) => ({ label, quantity, sharePercent: ratio(quantity, total) }))
}

export function buildProductReport(items: ItemRow[], limit = 20) {
  const byKey = new Map<string, { productId: string | null; name: string; quantity: number; valueVnd: number }>()
  for (const it of items) {
    const key = it.productId ?? `ngoai:${it.name}`
    const row = byKey.get(key) ?? { productId: it.productId, name: it.name, quantity: 0, valueVnd: 0 }
    row.quantity += it.quantity
    row.valueVnd += it.quantity * it.unitPriceVnd
    byKey.set(key, row)
  }
  const all = [...byKey.values()]
  return {
    byQuantity: [...all].sort((a, b) => b.quantity - a.quantity).slice(0, limit),
    byValue: [...all].sort((a, b) => b.valueVnd - a.valueVnd).slice(0, limit),
    colors: shares(items.map((i) => [attr(i.attributes, "mainColor", "color"), i.quantity])),
    styles: shares(items.map((i) => [attr(i.attributes, "style", "craftStyle"), i.quantity])),
  }
}

type Member = { userId: string; name: string; phone: string | null }
const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").replace(/^84/, "0")

export function buildPerformanceReport(orders: OrderRow[], assignments: AssignmentRow[], members: Member[]) {
  const nameOf = (id: string) => members.find((m) => m.userId === id)?.name ?? "Thành viên đã rời"
  const sales = new Map<string, { userId: string; name: string; orders: number; revenueVnd: number }>()
  for (const o of orders) {
    if (o.status === "CANCELLED") continue
    const row = sales.get(o.saleId) ?? { userId: o.saleId, name: nameOf(o.saleId), orders: 0, revenueVnd: 0 }
    row.orders++
    row.revenueVnd += o.totalVnd
    sales.set(o.saleId, row)
  }
  const florists = new Map<string, { userId: string; name: string; assigned: number; done: number }>()
  for (const a of assignments) {
    const row = florists.get(a.assigneeId) ?? { userId: a.assigneeId, name: nameOf(a.assigneeId), assigned: 0, done: 0 }
    row.assigned++
    if (a.productionStatus === "READY" || a.orderStatus === "DELIVERED" || a.orderStatus === "COMPLETED") row.done++
    florists.set(a.assigneeId, row)
  }
  const shippers = new Map<string, { key: string; name: string; delivered: number; onTime: number; onTimeRate: number | null }>()
  for (const o of orders) {
    if (!o.shipper || !o.deliveredAt) continue
    const phone = digits(o.shipper.phone)
    const member = phone ? members.find((m) => digits(m.phone) === phone) : undefined
    const key = member?.userId ?? (phone || o.shipper.name || "khac")
    const row = shippers.get(key) ?? { key, name: member?.name ?? o.shipper.name ?? "Shipper ngoài", delivered: 0, onTime: 0, onTimeRate: null }
    row.delivered++
    const deadline = deliveryDeadline(o.deliveryWindow, o.estimatedAt)
    if (!deadline || o.deliveredAt.getTime() <= deadline.getTime()) row.onTime++
    row.onTimeRate = ratio(row.onTime, row.delivered)
    shippers.set(key, row)
  }
  return {
    sales: [...sales.values()].sort((a, b) => b.revenueVnd - a.revenueVnd),
    florists: [...florists.values()].sort((a, b) => b.done - a.done),
    shippers: [...shippers.values()].sort((a, b) => b.delivered - a.delivered),
  }
}
