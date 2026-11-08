import { describe, expect, it } from "vitest"
import { businessSummaryCsv, rangePeriod, summarizeBusiness } from "@/modules/reporting/domain/business-summary"

/**
 * Audit BL-12 (06/11/2026): `/so-lieu` tính KPI trên 100 đơn đầu ở trình duyệt, với tập trạng thái lệch enum
 * (thiếu DELIVERED), "Sản phẩm bán chạy" đọc trường không có. PO 07/11/2026 (Q4): chỉ số chính là giá trị đơn,
 * hiện cả doanh thu đã thu thực tế — lấy từ báo cáo theo kỳ phía máy chủ.
 */
describe("rangePeriod — kỳ theo giờ Việt Nam", () => {
  it("Tuần này: từ thứ Hai đến hôm nay (23:30 UTC thứ Bảy là Chủ nhật ở Việt Nam)", () => {
    expect(rangePeriod("Tuần này", new Date("2026-11-07T23:30:00Z"))).toEqual({ from: "2026-11-02", to: "2026-11-08" })
  })
  it("Tuần này vào thứ Hai: chỉ hôm nay", () => {
    expect(rangePeriod("Tuần này", new Date("2026-11-09T03:00:00Z"))).toEqual({ from: "2026-11-09", to: "2026-11-09" })
  })
  it("Tháng này và Quý này", () => {
    const now = new Date("2026-11-07T05:00:00Z")
    expect(rangePeriod("Tháng này", now)).toEqual({ from: "2026-11-01", to: "2026-11-07" })
    expect(rangePeriod("Quý này", now)).toEqual({ from: "2026-10-01", to: "2026-11-07" })
  })
})

describe("summarizeBusiness", () => {
  const orders = { total: 150, completed: 90, cancelled: 10, overdueOpen: 3, completionRate: 60 }
  const revenue = { expectedVnd: 70_000_000, netCollectedVnd: 52_000_000, collectionRate: 74.3 }
  const products = Array.from({ length: 8 }, (_, i) => ({ productId: `p${i}`, name: `Mẫu ${i}`, quantity: 8 - i, valueVnd: (8 - i) * 100_000 }))

  it("đủ 150 đơn: giá trị đơn, đã thu, trung bình trên đơn chưa huỷ, đơn đang xử lý", () => {
    const s = summarizeBusiness(orders, revenue, products, 12)
    expect(s.orderValueVnd).toBe(70_000_000)
    expect(s.collectedVnd).toBe(52_000_000)
    expect(s.averageOrderValueVnd).toBe(500_000)
    expect(s.openOrders).toBe(50)
    expect(s.totalOrders).toBe(150)
    expect(s.topProducts).toHaveLength(5)
    expect(s.aiCreditUsed).toBe(12)
  })

  it("kỳ chưa có đơn: không chia cho 0", () => {
    const s = summarizeBusiness({ total: 0, completed: 0, cancelled: 0, overdueOpen: 0, completionRate: null }, { expectedVnd: 0, netCollectedVnd: 0, collectionRate: null }, [])
    expect(s.averageOrderValueVnd).toBe(0)
    expect(s.openOrders).toBe(0)
  })

  it("CSV có cả giá trị đơn và đã thu, tên sản phẩm có dấu nháy được thoát", () => {
    const s = summarizeBusiness(orders, revenue, [{ productId: null, name: 'Bó "Hồng"', quantity: 2, valueVnd: 600_000 }])
    const csv = businessSummaryCsv(s, "Tiệm Hoa", { from: "2026-11-01", to: "2026-11-07" }, new Date("2026-11-07T05:00:00Z"))
    expect(csv).toContain("Giá trị đơn (VND),70000000")
    expect(csv).toContain("Đã thu thực tế (VND),52000000")
    expect(csv).toContain('"Bó ""Hồng""",2,600000')
    expect(csv).toContain("Kỳ báo cáo: 2026-11-01 đến 2026-11-07")
  })
})
