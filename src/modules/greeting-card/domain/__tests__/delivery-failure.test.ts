import { describe, expect, it } from "vitest"
import {
  deliveryFailureError,
  latestFailureForCustomer,
  parseRedeliveryFee,
  readDeliveryFailures,
  redeliveryFeeFor,
  windowWithFailure,
  type DeliveryFailureRecord,
} from "../delivery-failure"
import { coordinatorActionBlocker } from "../brochure-commerce-rules"
import { mapOrderStatusToTrackingStep } from "../greeting-card-rules"
import { smsText } from "../customer-notifications"

const FAIL: DeliveryFailureRecord = { at: "2026-10-20T03:00:00.000Z", reason: "NO_ANSWER", reasonLabel: "Người nhận không nghe máy", note: "Gọi 3 lần", feeVnd: 30_000, by: "u1" }

describe("parseRedeliveryFee", () => {
  it("đọc phí tiệm cài; thiếu/sai/âm → 0", () => {
    expect(parseRedeliveryFee({ brochure_shipping: { redelivery_fee_vnd: 30000 } })).toBe(30_000)
    expect(parseRedeliveryFee({ brochure_shipping: {} })).toBe(0)
    expect(parseRedeliveryFee({ brochure_shipping: { redelivery_fee_vnd: -5 } })).toBe(0)
    expect(parseRedeliveryFee(null)).toBe(0)
  })
})

describe("deliveryFailureError / redeliveryFeeFor", () => {
  it("lý do khác phải ghi rõ; ghi chú không quá dài", () => {
    expect(deliveryFailureError({ reason: "NO_ANSWER" })).toBeNull()
    expect(deliveryFailureError({ reason: "OTHER", note: "" })).toMatch(/Ghi rõ/)
    expect(deliveryFailureError({ reason: "NOT_HOME", note: "x".repeat(301) })).toMatch(/tối đa/)
  })

  it("chỉ tính phí khi Điều phối chọn tính và đơn đã có giá", () => {
    expect(redeliveryFeeFor({ chargeFee: true, configuredFeeVnd: 30_000, totalVnd: 500_000 })).toBe(30_000)
    expect(redeliveryFeeFor({ chargeFee: false, configuredFeeVnd: 30_000, totalVnd: 500_000 })).toBe(0)
    expect(redeliveryFeeFor({ chargeFee: true, configuredFeeVnd: 30_000, totalVnd: 0 })).toBe(0)
  })
})

describe("lịch sử giao hỏng trong delivery_window", () => {
  it("thêm lần mới, giữ ngày giờ, bỏ bản ghi hỏng", () => {
    const w = windowWithFailure({ date: "2026-10-20", timeSlot: "08:00 - 10:00", failures: [{ bad: true }] }, FAIL)
    expect(w).toMatchObject({ date: "2026-10-20", timeSlot: "08:00 - 10:00" })
    expect(readDeliveryFailures(w)).toHaveLength(1)
  })

  it("khách chưa xác minh không thấy ghi chú của shipper", () => {
    const w = windowWithFailure({}, FAIL)
    expect(latestFailureForCustomer(w, false)).toMatchObject({ reasonLabel: "Người nhận không nghe máy", note: null, attempts: 1 })
    expect(latestFailureForCustomer(w, true)?.note).toBe("Gọi 3 lần")
    expect(latestFailureForCustomer({}, true)).toBeNull()
  })
})

describe("thứ tự tác vụ khi giao hỏng", () => {
  it("chỉ ghi giao hỏng khi đang giao; sau đó giao ship lại được, chưa chụp ảnh người nhận được", () => {
    expect(coordinatorActionBlocker("delivery-failed", { status: "PROCESSING", productionStatus: "READY", deliveryStatus: "PENDING" })).toMatch(/đang được giao/)
    expect(coordinatorActionBlocker("delivery-failed", { status: "PROCESSING", productionStatus: "READY", deliveryStatus: "DELIVERING" })).toBeNull()
    const failed = { status: "PROCESSING", productionStatus: "READY", deliveryStatus: "FAILED" }
    expect(coordinatorActionBlocker("dispatch-shipping", failed)).toBeNull()
    expect(coordinatorActionBlocker("recipient-photo", failed)).not.toBeNull()
    expect(coordinatorActionBlocker("assign-florist", failed)).not.toBeNull()
  })

  it("trang theo dõi báo giao chưa thành công; tin SMS không dấu", () => {
    expect(mapOrderStatusToTrackingStep("PROCESSING", "READY", "FAILED")).toMatchObject({ stepIndex: 4, title: "Giao hàng chưa thành công" })
    const sms = smsText("DELIVERY_FAILED", { order_code: "DH1", customer_name: "A", shop_name: "Hoa", status: "", amount: "", tracking_url: "" })
    expect(sms).toMatch(/chua giao duoc/)
  })
})
