import { describe, it, expect } from "vitest"
import {
  classifySlaStatus,
  suggestEscalationAction,
  evaluateOrderSla,
  computeSlaSummaryReport,
  type SlaOrderInput,
} from "../sla-monitor"

describe("sla-monitor — SC-01..06", () => {
  describe("classifySlaStatus (SC-01)", () => {
    it("đánh dấu ON_TRACK cho các stage kết thúc (COMPLETED, DELIVERED, CANCELLED)", () => {
      expect(classifySlaStatus(-45, "COMPLETED")).toBe("ON_TRACK")
      expect(classifySlaStatus(-10, "DELIVERED")).toBe("ON_TRACK")
      expect(classifySlaStatus(-120, "CANCELLED")).toBe("ON_TRACK")
    })

    it("đánh dấu ON_TRACK khi không có timeRemaining", () => {
      expect(classifySlaStatus(null, "IN_PRODUCTION")).toBe("ON_TRACK")
    })

    it("đánh dấu BREACHED khi timeRemaining < 0", () => {
      expect(classifySlaStatus(-1, "IN_PRODUCTION")).toBe("BREACHED")
      expect(classifySlaStatus(-30, "DISPATCHING")).toBe("BREACHED")
    })

    it("đánh dấu NEAR_BREACH khi timeRemaining <= 30 và >= 0", () => {
      expect(classifySlaStatus(0, "IN_PRODUCTION")).toBe("NEAR_BREACH")
      expect(classifySlaStatus(15, "ASSIGNING")).toBe("NEAR_BREACH")
      expect(classifySlaStatus(30, "QUALITY_CHECK")).toBe("NEAR_BREACH")
    })

    it("đánh dấu ON_TRACK khi timeRemaining > 30", () => {
      expect(classifySlaStatus(31, "IN_PRODUCTION")).toBe("ON_TRACK")
      expect(classifySlaStatus(120, "PLANNING")).toBe("ON_TRACK")
    })
  })

  describe("suggestEscalationAction (SC-02)", () => {
    it("không có gợi ý khi đúng tiến độ ON_TRACK", () => {
      expect(suggestEscalationAction("ON_TRACK", "IN_PRODUCTION", true)).toBeNull()
    })

    it("gợi ý tái điều phối khẩn khi vỡ SLA ở bước phân công hoặc chưa có đối tác", () => {
      const action = suggestEscalationAction("BREACHED", "ASSIGNING", false)
      expect(action).toContain("Tái điều phối")
    })

    it("gợi ý cảnh báo xưởng khi vỡ SLA ở bước sản xuất", () => {
      const action = suggestEscalationAction("BREACHED", "IN_PRODUCTION", true)
      expect(action).toContain("Cảnh báo xưởng")
    })

    it("gợi ý duyệt QC hoả tốc khi vỡ SLA ở bước QC", () => {
      const action = suggestEscalationAction("BREACHED", "QUALITY_CHECK", true)
      expect(action).toContain("Duyệt QC hoả tốc")
    })

    it("gợi ý liên hệ shipper khẩn khi vỡ SLA ở bước giao hàng", () => {
      const action = suggestEscalationAction("BREACHED", "DISPATCHING", true)
      expect(action).toContain("shipper")
    })

    it("gợi ý ưu tiên gán xưởng gần khi sắp trễ NEAR_BREACH ở bước ASSIGNING", () => {
      const action = suggestEscalationAction("NEAR_BREACH", "ASSIGNING", false)
      expect(action).toContain("3km")
    })
  })

  describe("evaluateOrderSla (SC-01, SC-02)", () => {
    it("trả về đánh giá đầy đủ kèm badge variant và gợi ý", () => {
      const result = evaluateOrderSla({
        timeRemainingMinutes: -15,
        stage: "IN_PRODUCTION",
        hasPartner: true,
      })
      expect(result.status).toBe("BREACHED")
      expect(result.badgeVariant).toBe("danger")
      expect(result.suggestedAction).not.toBeNull()
    })
  })

  describe("computeSlaSummaryReport (SC-04, SC-06)", () => {
    it("tính toán chính xác tỷ lệ tuân thủ toàn mạng lưới và theo đối tác", () => {
      const orders: SlaOrderInput[] = [
        { stage: "IN_PRODUCTION", timeRemaining: 60, partnerName: "Xưởng Hoa Hồng" },
        { stage: "IN_PRODUCTION", timeRemaining: 15, partnerName: "Xưởng Hoa Hồng" }, // near breach
        { stage: "DISPATCHING", timeRemaining: -20, partnerName: "Xưởng Hoa Sen" }, // breach
        { stage: "ASSIGNING", timeRemaining: -10, partnerName: null }, // breach, chưa phân công
        { stage: "COMPLETED", timeRemaining: -50, partnerName: "Xưởng Hoa Sen" }, // terminal stage -> bỏ qua
      ]

      const report = computeSlaSummaryReport(orders)

      expect(report.totalActiveOrders).toBe(4)
      expect(report.onTrackCount).toBe(1)
      expect(report.nearBreachCount).toBe(1)
      expect(report.breachedCount).toBe(2)
      // 2/4 vỡ SLA => tỷ lệ 50%
      expect(report.overallComplianceRatePercent).toBe(50)

      const hoaHong = report.partnerStats.find((p) => p.partnerName === "Xưởng Hoa Hồng")
      expect(hoaHong).toBeDefined()
      expect(hoaHong?.totalOrders).toBe(2)
      expect(hoaHong?.breachedOrders).toBe(0)
      expect(hoaHong?.complianceRatePercent).toBe(100)

      const hoaSen = report.partnerStats.find((p) => p.partnerName === "Xưởng Hoa Sen")
      expect(hoaSen?.totalOrders).toBe(1)
      expect(hoaSen?.breachedOrders).toBe(1)
      expect(hoaSen?.complianceRatePercent).toBe(0)
    })
  })
})
