import { describe, expect, it } from "vitest"

import {
  checkCancellation,
  checkClosure,
  checkDeliveryUpdate,
  checkPartnerAssignment,
  checkProductionUpdate,
  checkQcDecision,
  coordinatorOrderCode,
  deliveryStatusFor,
  evaluateRisk,
  exceptionCode,
  stageAfterQc,
} from "@/modules/coordinator/domain/operation-rules"

describe("phân công đối tác (F05)", () => {
  it("chỉ ở PLANNING/ASSIGNING/IN_PRODUCTION và đối tác đang hoạt động", () => {
    expect(checkPartnerAssignment({ stage: "PLANNING", partnerActive: true }).ok).toBe(true)
    expect(checkPartnerAssignment({ stage: "DISPATCHING", partnerActive: true }).ok).toBe(false)
    expect(checkPartnerAssignment({ stage: "ASSIGNING", partnerActive: false }).ok).toBe(false)
  })
})

describe("cập nhật sản xuất (F08)", () => {
  it("báo cắm xong phải kèm ảnh thành phẩm", () => {
    expect(checkProductionUpdate({ stage: "IN_PRODUCTION", progressPercent: 100, markReady: true, finishedAssetCount: 0 }).ok).toBe(false)
    expect(checkProductionUpdate({ stage: "IN_PRODUCTION", progressPercent: 100, markReady: true, finishedAssetCount: 1 }).ok).toBe(true)
  })
  it("tiến độ ngoài 0–100 hoặc sai bước bị từ chối", () => {
    expect(checkProductionUpdate({ stage: "IN_PRODUCTION", progressPercent: 120, markReady: false, finishedAssetCount: 0 }).ok).toBe(false)
    expect(checkProductionUpdate({ stage: "PLANNING", progressPercent: 50, markReady: false, finishedAssetCount: 0 }).ok).toBe(false)
  })
})

describe("QC (F10)", () => {
  it("không đạt phải có lý do; đạt không cần", () => {
    expect(checkQcDecision({ stage: "QUALITY_CHECK", decision: "REWORK_REQUESTED", notes: " ", imageCount: 1 }).ok).toBe(false)
    expect(checkQcDecision({ stage: "QUALITY_CHECK", decision: "PASSED", notes: null, imageCount: 1 }).ok).toBe(true)
  })
  it("không có ảnh thì không kiểm", () => {
    expect(checkQcDecision({ stage: "QUALITY_CHECK", decision: "PASSED", notes: null, imageCount: 0 }).ok).toBe(false)
  })
  it("bước kế tiếp theo kết luận", () => {
    expect(stageAfterQc("PASSED")).toBe("DISPATCHING")
    expect(stageAfterQc("REWORK_REQUESTED")).toBe("IN_PRODUCTION")
    expect(stageAfterQc("REJECTED")).toBe("EXCEPTION")
  })
})

describe("giao hàng (F11/F12)", () => {
  const base = {
    stage: "DISPATCHING" as const,
    currentState: null,
    shipperName: "Bình",
    podAssetId: null,
    recipientSignedName: null,
    failureReason: null,
  }
  it("mặc định giao thành công bắt buộc ảnh giao hàng; tên người ký không thay được ảnh (checklist ALG 4.18)", () => {
    expect(checkDeliveryUpdate({ ...base, event: "DELIVERED_SUCCESS" }).ok).toBe(false)
    expect(checkDeliveryUpdate({ ...base, event: "DELIVERED_SUCCESS", recipientSignedName: "Lan" }).ok).toBe(false)
    expect(checkDeliveryUpdate({ ...base, event: "DELIVERED_SUCCESS", podAssetId: "a1" }).ok).toBe(true)
  })
  it("Điều hành tắt yêu cầu ảnh: tên người ký nhận thay được ảnh, thiếu cả hai vẫn chặn", () => {
    const off = { ...base, requirePodPhoto: false }
    expect(checkDeliveryUpdate({ ...off, event: "DELIVERED_SUCCESS" }).ok).toBe(false)
    expect(checkDeliveryUpdate({ ...off, event: "DELIVERED_SUCCESS", recipientSignedName: "Lan" }).ok).toBe(true)
  })
  it("giao thất bại đòi lý do; không lùi trạng thái", () => {
    expect(checkDeliveryUpdate({ ...base, event: "DELIVERY_FAILED" }).ok).toBe(false)
    expect(checkDeliveryUpdate({ ...base, currentState: "ON_THE_WAY", event: "PICKED_UP" }).ok).toBe(false)
  })
  it("thiếu shipper hoặc sai bước bị từ chối", () => {
    expect(checkDeliveryUpdate({ ...base, shipperName: "", event: "PICKED_UP" }).ok).toBe(false)
    expect(checkDeliveryUpdate({ ...base, stage: "QUALITY_CHECK", event: "PICKED_UP" }).ok).toBe(false)
  })
  it("ánh xạ trục delivery_status", () => {
    expect(deliveryStatusFor("PICKED_UP")).toBe("DISPATCHED")
    expect(deliveryStatusFor("ON_THE_WAY")).toBe("DELIVERING")
    expect(deliveryStatusFor("DELIVERED_SUCCESS")).toBe("DELIVERED")
    expect(deliveryStatusFor("DELIVERY_FAILED")).toBe("FAILED")
  })
})

describe("rủi ro trễ (F09/F12)", () => {
  const now = new Date("2026-09-25T09:00:00Z")
  const at = (min: number) => new Date(now.getTime() + min * 60_000)
  it("quá giờ hẹn → CRITICAL", () => {
    expect(evaluateRisk({ stage: "IN_PRODUCTION", targetDeliveryAt: at(-5), openExceptionCount: 0, deliveryState: null, now }).riskLevel).toBe("CRITICAL")
  })
  it("sự cố mở → CRITICAL", () => {
    expect(evaluateRisk({ stage: "PLANNING", targetDeliveryAt: at(600), openExceptionCount: 1, deliveryState: null, now }).riskLevel).toBe("CRITICAL")
  })
  it("đang giao, còn 10 phút mà shipper chưa lên đường → AT_RISK", () => {
    expect(evaluateRisk({ stage: "DISPATCHING", targetDeliveryAt: at(10), openExceptionCount: 0, deliveryState: "PICKED_UP", now }).riskLevel).toBe("AT_RISK")
    expect(evaluateRisk({ stage: "DISPATCHING", targetDeliveryAt: at(10), openExceptionCount: 0, deliveryState: "ON_THE_WAY", now }).riskLevel).toBe("NORMAL")
  })
  it("còn 90 phút chưa vào sản xuất → ATTENTION; đã giao → NORMAL", () => {
    expect(evaluateRisk({ stage: "PLANNING", targetDeliveryAt: at(90), openExceptionCount: 0, deliveryState: null, now }).riskLevel).toBe("ATTENTION")
    expect(evaluateRisk({ stage: "DELIVERED", targetDeliveryAt: at(-90), openExceptionCount: 0, deliveryState: null, now }).riskLevel).toBe("NORMAL")
  })
})

describe("đóng đơn / huỷ (F14)", () => {
  it("chỉ đóng khi DELIVERED và không còn sự cố", () => {
    expect(checkClosure({ stage: "DELIVERED", openExceptionCount: 0, partnerRating: 5, partnerPayoutVnd: 300000 }).ok).toBe(true)
    expect(checkClosure({ stage: "DISPATCHING", openExceptionCount: 0, partnerRating: 5, partnerPayoutVnd: 0 }).ok).toBe(false)
    expect(checkClosure({ stage: "DELIVERED", openExceptionCount: 1, partnerRating: 5, partnerPayoutVnd: 0 }).ok).toBe(false)
    expect(checkClosure({ stage: "DELIVERED", openExceptionCount: 0, partnerRating: 7, partnerPayoutVnd: 0 }).ok).toBe(false)
    // Còn nợ thì chưa hoàn tất (checklist ALG 4.26)
    expect(checkClosure({ stage: "DELIVERED", openExceptionCount: 0, partnerRating: 5, partnerPayoutVnd: 0, balanceVnd: 200000 }).ok).toBe(false)
    expect(checkClosure({ stage: "DELIVERED", openExceptionCount: 0, partnerRating: 5, partnerPayoutVnd: 0, balanceVnd: 0 }).ok).toBe(true)
  })
  it("huỷ đòi lý do, không huỷ đơn đã giao", () => {
    expect(checkCancellation({ stage: "PLANNING", reason: "" }).ok).toBe(false)
    expect(checkCancellation({ stage: "DELIVERED", reason: "khách đổi ý" }).ok).toBe(false)
    expect(checkCancellation({ stage: "IN_PRODUCTION", reason: "khách đổi ý" }).ok).toBe(true)
  })
})

describe("mã đơn và mã sự cố", () => {
  it("tuần tự theo ngày, đệm số 0", () => {
    expect(coordinatorOrderCode(7, new Date(2026, 8, 25))).toBe("FLR-260925-0007")
    expect(exceptionCode("FLR-260925-0007", 3)).toBe("EXC-FLR-260925-0007-03")
  })

  it("ngày trong mã theo giờ Việt Nam: 23:30 UTC đã sang ngày hôm sau", () => {
    expect(coordinatorOrderCode(1, new Date("2026-11-06T23:30:00Z"))).toBe("FLR-261107-0001")
  })
})
