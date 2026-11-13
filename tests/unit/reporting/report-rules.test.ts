import { describe, expect, it } from "vitest"

import { bucketOf, bucketsOf, deliveryDeadline, parsePeriod } from "@/modules/reporting/domain/report-period"
import { buildOrderReport, buildRevenueReport } from "@/modules/reporting/domain/order-revenue-report"
import { buildProductReport, buildPerformanceReport } from "@/modules/reporting/domain/product-performance-report"
import { buildCashflowReport } from "@/modules/reporting/domain/cashflow-report"
import type { OrderRow } from "@/modules/reporting/domain/report-rows"

/** Đợt 5 — kỳ báo cáo giờ Việt Nam, hạn giao, trễ, doanh thu, tỷ trọng, đối chiếu dòng tiền. */
const p = parsePeriod({ from: "2026-11-02", to: "2026-11-08", granularity: "day" })!
const at = (s: string) => new Date(s)
const order = (o: Partial<OrderRow>): OrderRow => ({
  id: "o", code: "DH", status: "CONFIRMED", totalVnd: 0, paidVnd: 0, createdAt: at("2026-11-03T03:00:00Z"), deliveryWindow: null,
  saleId: "s1", estimatedAt: null, shipper: null, deliveredAt: null, ...o,
})

describe("kỳ báo cáo", () => {
  it("kỳ mặc định 30 ngày, quá 366 ngày hoặc ngược thứ tự → null", () => {
    expect(parsePeriod({}, at("2026-11-05T10:00:00Z"))).toMatchObject({ from: "2026-10-07", to: "2026-11-05" })
    expect(parsePeriod({ from: "2026-11-09", to: "2026-11-01" })).toBeNull()
    expect(parsePeriod({ from: "2025-01-01", to: "2026-11-01" })).toBeNull()
  })

  it("nhóm theo giờ Việt Nam; tuần bắt đầu thứ Hai; đủ mọi ngày trong kỳ", () => {
    expect(bucketOf(at("2026-11-04T18:30:00Z"), "day")).toBe("2026-11-05")
    expect(bucketOf(at("2026-11-08T05:00:00Z"), "week")).toBe("2026-11-02")
    expect(bucketsOf(p)).toHaveLength(7)
  })

  it("hạn giao: giờ hẹn Điều phối → cuối khung giờ → cuối ngày", () => {
    expect(deliveryDeadline({ date: "2026-11-03", timeSlot: "08:00 - 10:00" }, null)?.toISOString()).toBe("2026-11-03T03:00:00.000Z")
    expect(deliveryDeadline({ date: "2026-11-03" }, null)?.toISOString()).toBe("2026-11-03T17:00:00.000Z")
    expect(deliveryDeadline(null, at("2026-11-03T05:00:00Z"))?.toISOString()).toBe("2026-11-03T05:00:00.000Z")
    expect(deliveryDeadline(null, null)).toBeNull()
  })
})

describe("báo cáo đơn và doanh thu", () => {
  const orders = [
    order({ status: "COMPLETED", totalVnd: 500_000, deliveryWindow: { date: "2026-11-03", timeSlot: "08:00 - 10:00" }, deliveredAt: at("2026-11-03T04:00:00Z") }),
    order({ status: "DELIVERED", totalVnd: 300_000, deliveryWindow: { date: "2026-11-03", timeSlot: "08:00 - 10:00" }, deliveredAt: at("2026-11-03T02:00:00Z") }),
    order({ status: "CANCELLED", totalVnd: 200_000 }),
    order({ status: "PROCESSING", totalVnd: 100_000, deliveryWindow: { date: "2026-11-04" } }),
  ]
  it("hoàn tất, huỷ, trễ hẹn, đang trễ", () => {
    const r = buildOrderReport(orders, p, at("2026-11-06T00:00:00Z"))
    expect(r.totals).toMatchObject({ total: 4, completed: 2, cancelled: 1, delivered: 2, late: 1, overdueOpen: 1, completionRate: 50, lateRate: 50 })
  })

  it("dự kiến = đơn chưa huỷ; thực thu = thu trừ hoàn", () => {
    const r = buildRevenueReport(orders, [
      { kind: "DEPOSIT", amountVnd: 400_000, method: "BANK_TRANSFER", collectedAt: at("2026-11-03T05:00:00Z") },
      { kind: "REFUND", amountVnd: 50_000, method: "BANK_TRANSFER", collectedAt: at("2026-11-04T05:00:00Z") },
    ], p)
    expect(r.totals).toMatchObject({ expectedVnd: 900_000, collectedVnd: 400_000, refundedVnd: 50_000, netCollectedVnd: 350_000 })
  })

  it("audit BL-30: đơn Nháp không vào dự kiến, đếm riêng đơn chờ chốt", () => {
    const r = buildRevenueReport([...orders, order({ status: "DRAFT", totalVnd: 700_000 })], [], p)
    expect(r.totals).toMatchObject({ expectedVnd: 900_000, draftCount: 1, draftVnd: 700_000 })
    expect(r.series.reduce((n, s) => n + s.expectedVnd, 0)).toBe(900_000)
  })
})

describe("sản phẩm, hiệu suất, dòng tiền", () => {
  it("xếp hạng và tỷ trọng màu/phong cách theo số lượng", () => {
    const r = buildProductReport([
      { productId: "a", name: "Bó hồng", quantity: 3, unitPriceVnd: 100_000, attributes: { mainColor: "Đỏ", style: "Hiện đại" } },
      { productId: "b", name: "Giỏ lan", quantity: 1, unitPriceVnd: 900_000, attributes: { color: "Trắng", craftStyle: "GIO_HOA" } },
    ])
    expect(r.byQuantity[0]?.name).toBe("Bó hồng")
    expect(r.byValue[0]?.name).toBe("Giỏ lan")
    expect(r.colors).toEqual([{ label: "Đỏ", quantity: 3, sharePercent: 75 }, { label: "Trắng", quantity: 1, sharePercent: 25 }])
  })

  it("shipper khớp thành viên theo số điện thoại; đúng giờ khi giao trước hạn", () => {
    const r = buildPerformanceReport([
      order({ status: "DELIVERED", shipper: { phone: "+84912345678", name: null }, deliveryWindow: { date: "2026-11-03", timeSlot: "08:00 - 10:00" }, deliveredAt: at("2026-11-03T02:00:00Z") }),
      order({ status: "DELIVERED", shipper: { phone: "0912345678", name: null }, deliveryWindow: { date: "2026-11-03", timeSlot: "08:00 - 10:00" }, deliveredAt: at("2026-11-03T05:00:00Z") }),
    ], [{ assigneeId: "f1", orderStatus: "COMPLETED", productionStatus: "READY" }], [{ userId: "u9", name: "Anh Ba", phone: "0912 345 678" }, { userId: "f1", name: "Thợ Tư", phone: null }])
    expect(r.shippers).toEqual([{ key: "u9", name: "Anh Ba", delivered: 2, onTime: 1, onTimeRate: 50 }])
    expect(r.florists[0]).toMatchObject({ name: "Thợ Tư", assigned: 1, done: 1 })
  })

  it("đối chiếu: lệch = sổ chuyển khoản − ngân hàng đã khớp; liệt kê khoản chưa khớp", () => {
    const r = buildCashflowReport(
      [{ kind: "BALANCE", amountVnd: 500_000, method: "BANK_TRANSFER", collectedAt: at("2026-11-03T05:00:00Z") }, { kind: "BALANCE", amountVnd: 200_000, method: "CASH", collectedAt: at("2026-11-03T05:00:00Z") }],
      [{ id: "e1", amountVnd: 300_000, content: "CK DH1", status: "MATCHED", at: at("2026-11-03T04:00:00Z"), orderId: "o" }, { id: "e2", amountVnd: 90_000, content: "chuyen tien", status: "UNMATCHED", at: at("2026-11-03T06:00:00Z"), orderId: null }],
      p,
    )
    expect(r.byMethod.map((m) => [m.method, m.netVnd])).toEqual([["BANK_TRANSFER", 500_000], ["CASH", 200_000]])
    expect(r.daily.find((d) => d.date === "2026-11-03")).toMatchObject({ ledgerTransferVnd: 500_000, bankMatchedVnd: 300_000, bankUnmatchedVnd: 90_000, unmatchedCount: 1, differenceVnd: 200_000 })
    expect(r.unmatched.map((u) => u.id)).toEqual(["e2"])
  })
})
