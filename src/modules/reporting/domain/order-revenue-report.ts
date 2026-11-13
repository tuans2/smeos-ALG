import { bucketOf, bucketsOf, deliveryDeadline, ratio, type ReportPeriod } from "./report-period"
import type { OrderRow, PaymentRow } from "./report-rows"

/**
 * Báo cáo đơn (6.1) và doanh thu (6.2) — luật thuần.
 * Hoàn tất = đã giao hoặc hoàn tất. Trễ = giao sau hạn (giờ hẹn Điều phối, cuối khung giờ đã hẹn, hoặc cuối ngày
 * giao). Đang trễ = chưa giao, chưa huỷ, đã quá hạn. Doanh thu dự kiến = tổng giá trị đơn đã chốt (không Nháp, không
 * huỷ) tạo trong kỳ; đơn Nháp (đơn catalog chưa thu, có thể tự huỷ) đếm riêng "Đơn chờ chốt" (PO 12/11/2026, audit
 * BL-30); thực thu = khoản thu đã xác nhận trong kỳ (cọc + thu nốt) trừ hoàn tiền.
 */

const DONE = new Set(["DELIVERED", "COMPLETED"])

export function isLate(o: OrderRow): boolean {
  const deadline = deliveryDeadline(o.deliveryWindow, o.estimatedAt)
  return Boolean(deadline && o.deliveredAt && o.deliveredAt.getTime() > deadline.getTime())
}

export function isOverdueOpen(o: OrderRow, now: Date): boolean {
  if (o.status === "CANCELLED" || DONE.has(o.status) || o.deliveredAt) return false
  const deadline = deliveryDeadline(o.deliveryWindow, o.estimatedAt)
  return Boolean(deadline && deadline.getTime() < now.getTime())
}

export function buildOrderReport(orders: OrderRow[], p: ReportPeriod, now: Date = new Date()) {
  const keys = bucketsOf(p)
  const rows = new Map(keys.map((k) => [k, { bucket: k, total: 0, completed: 0, cancelled: 0, late: 0 }]))
  let completed = 0, cancelled = 0, late = 0, delivered = 0, overdueOpen = 0
  for (const o of orders) {
    const r = rows.get(bucketOf(o.createdAt, p.granularity))
    const done = DONE.has(o.status)
    const isCancelled = o.status === "CANCELLED"
    const lateOne = isLate(o)
    if (r) { r.total++; if (done) r.completed++; if (isCancelled) r.cancelled++; if (lateOne) r.late++ }
    if (done) completed++
    if (isCancelled) cancelled++
    if (o.deliveredAt) delivered++
    if (lateOne) late++
    if (isOverdueOpen(o, now)) overdueOpen++
  }
  const total = orders.length
  return {
    period: { from: p.from, to: p.to, granularity: p.granularity },
    totals: {
      total, completed, cancelled, delivered, late, overdueOpen,
      completionRate: ratio(completed, total), cancelRate: ratio(cancelled, total), lateRate: ratio(late, delivered),
    },
    series: [...rows.values()],
  }
}

export function buildRevenueReport(orders: OrderRow[], payments: PaymentRow[], p: ReportPeriod) {
  const keys = bucketsOf(p)
  const rows = new Map(keys.map((k) => [k, { bucket: k, expectedVnd: 0, collectedVnd: 0, refundedVnd: 0 }]))
  let expectedVnd = 0, collectedVnd = 0, refundedVnd = 0, draftCount = 0, draftVnd = 0
  for (const o of orders) {
    if (o.status === "CANCELLED") continue
    if (o.status === "DRAFT") { draftCount++; draftVnd += o.totalVnd; continue }
    expectedVnd += o.totalVnd
    const r = rows.get(bucketOf(o.createdAt, p.granularity))
    if (r) r.expectedVnd += o.totalVnd
  }
  for (const pay of payments) {
    const r = rows.get(bucketOf(pay.collectedAt, p.granularity))
    if (pay.kind === "REFUND") { refundedVnd += pay.amountVnd; if (r) r.refundedVnd += pay.amountVnd }
    else { collectedVnd += pay.amountVnd; if (r) r.collectedVnd += pay.amountVnd }
  }
  return {
    period: { from: p.from, to: p.to, granularity: p.granularity },
    totals: {
      expectedVnd, collectedVnd, refundedVnd, netCollectedVnd: collectedVnd - refundedVnd,
      collectionRate: ratio(collectedVnd - refundedVnd, expectedVnd), draftCount, draftVnd,
    },
    series: [...rows.values()].map((r) => ({ ...r, netCollectedVnd: r.collectedVnd - r.refundedVnd })),
  }
}
