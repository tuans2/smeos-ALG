import { describe, it, expect } from "vitest"
import {
  cancelBlocker,
  expectedPayment,
  parsePaymentPolicy,
  paymentGateBlocker,
  paymentHoldUntil,
  quoteBlocker,
  resolveRequirePaymentProof,
  resolveTrackingTriggerPolicy,
  serializePaymentPolicy,
  applyHolidayAutoPreset,
} from "../brochure-payment-policy"

describe("parsePaymentPolicy", () => {
  it("mặc định trả đủ, không chặn; % cọc ngoài 1–99 bị bỏ; mặc định requirePaymentProof = true", () => {
    expect(parsePaymentPolicy(null)).toEqual({
      depositPercent: 0,
      requirePaidBeforeProduction: false,
      requireFullBeforeDispatch: false,
      requirePaymentProof: true,
      trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR",
      // Xác nhận tiền thu nốt mặc định chỉ Điều hành (PO 04/11/2026, Q3b — ALG 1.16)
      balancePaymentTriggerPolicy: "PAYMENT_ONLY",
      requireProductPhotoQC: true,
      requireRecipientPhoto: true,
      cancellationApprovalTimeoutMinutes: 15,
      holidayAutoMode: false,
      autoApprovePaymentWithProof: false,
      autoApprovePaymentWithProofMinutes: 15,
      productPhotoReviewMinutes: 10,
      allowShipperCash: false,
      aiReadPaymentProof: false,
    })
    expect(parsePaymentPolicy({ brochure_policy: { deposit_percent: 150 } }).depositPercent).toBe(0)
    expect(parsePaymentPolicy({ brochure_policy: { deposit_percent: 30, require_full_before_dispatch: true } })).toMatchObject({
      depositPercent: 30,
      requireFullBeforeDispatch: true,
      requirePaymentProof: true,
    })
    expect(parsePaymentPolicy({ brochure_policy: { require_payment_proof: false } }).requirePaymentProof).toBe(false)
    expect(parsePaymentPolicy({ brochure_policy: { require_product_photo_qc: false } }).requireProductPhotoQC).toBe(false)
    expect(parsePaymentPolicy({ brochure_policy: { require_recipient_photo: false } }).requireRecipientPhoto).toBe(false)
    expect(parsePaymentPolicy({ brochure_policy: { cancellation_approval_timeout_minutes: 30 } }).cancellationApprovalTimeoutMinutes).toBe(30)
    expect(parsePaymentPolicy({ brochure_policy: { holiday_auto_mode: true } }).holidayAutoMode).toBe(true)
    expect(parsePaymentPolicy({ brochure_policy: { auto_approve_payment_with_proof: true } }).autoApprovePaymentWithProof).toBe(true)
  })
})

describe("expectedPayment", () => {
  const policy = { depositPercent: 30, requirePaidBeforeProduction: true, requireFullBeforeDispatch: true }
  it("lần đầu thu cọc (làm tròn lên nghìn), lần sau thu phần còn lại", () => {
    expect(expectedPayment(policy, 1_234_500, 0)).toEqual({ amountVnd: 371_000, purpose: "DEPOSIT" })
    expect(expectedPayment(policy, 1_234_500, 371_000)).toEqual({ amountVnd: 863_500, purpose: "BALANCE" })
    expect(expectedPayment({ ...policy, depositPercent: 0 }, 500_000, 0)).toEqual({ amountVnd: 500_000, purpose: "FULL" })
  })
})

describe("paymentGateBlocker / cancelBlocker", () => {
  const policy = { depositPercent: 30, requirePaidBeforeProduction: true, requireFullBeforeDispatch: true }
  it("chặn cắm hoa khi chưa thu đồng nào, chặn giao khi chưa thu đủ", () => {
    expect(paymentGateBlocker("assign-florist", policy, { totalVnd: 100, paidVnd: 0 })).toMatch(/chế tác/)
    expect(paymentGateBlocker("assign-florist", policy, { totalVnd: 100, paidVnd: 30 })).toBeNull()
    expect(paymentGateBlocker("dispatch-shipping", policy, { totalVnd: 100, paidVnd: 30 })).toMatch(/lần 2/)
    expect(paymentGateBlocker("recipient-photo", policy, { totalVnd: 100, paidVnd: 0 })).toBeNull()
  })
  it("Cơ chế 2 (requireFullBeforeDispatch: false): đơn đặt cọc vẫn phải đợi xác nhận lần 2 trước khi giao ship", () => {
    const lax = { ...policy, requireFullBeforeDispatch: false }
    expect(paymentGateBlocker("dispatch-shipping", lax, { totalVnd: 100, paidVnd: 30 })).toMatch(/lần 2/)
    expect(paymentGateBlocker("dispatch-shipping", lax, { totalVnd: 100, paidVnd: 100 })).toBeNull()
  })
  it("không huỷ đơn đã giao hoặc đã huỷ", () => {
    expect(cancelBlocker({ status: "CONFIRMED", deliveryStatus: "DELIVERED" })).not.toBeNull()
    expect(cancelBlocker({ status: "CANCELLED", deliveryStatus: "PENDING" })).not.toBeNull()
    expect(cancelBlocker({ status: "DRAFT", deliveryStatus: "PENDING" })).toBeNull()
  })
})

describe("đơn chờ báo giá (tổng 0)", () => {
  const strict = { depositPercent: 0, requirePaidBeforeProduction: false, requireFullBeforeDispatch: true }

  it("không giao hoa khi chưa báo giá dù 0 ≥ 0", () => {
    expect(paymentGateBlocker("dispatch-shipping", strict, { totalVnd: 0, paidVnd: 0 })).toMatch(/báo giá/)
  })

  it("chỉ báo giá đơn tổng 0, chưa huỷ, số tiền nguyên dương", () => {
    expect(quoteBlocker({ status: "DRAFT", totalVnd: 0 }, 850_000)).toBeNull()
    expect(quoteBlocker({ status: "DRAFT", totalVnd: 500_000 }, 850_000)).not.toBeNull()
    expect(quoteBlocker({ status: "CANCELLED", totalVnd: 0 }, 850_000)).not.toBeNull()
    expect(quoteBlocker({ status: "DRAFT", totalVnd: 0 }, 0)).not.toBeNull()
    expect(quoteBlocker({ status: "DRAFT", totalVnd: 0 }, 1.5)).not.toBeNull()
  })
})

describe("hạn thanh toán + ghi chính sách", () => {
  it("đọc payment_timeout_minutes 5–1440; ngoài khoảng bỏ", () => {
    expect(parsePaymentPolicy({ brochure_policy: { payment_timeout_minutes: 30 } }).paymentTimeoutMinutes).toBe(30)
    expect(parsePaymentPolicy({ brochure_policy: { payment_timeout_minutes: 0 } }).paymentTimeoutMinutes).toBeUndefined()
    expect(parsePaymentPolicy({ brochure_policy: { payment_timeout_minutes: 3 } }).paymentTimeoutMinutes).toBeUndefined()
  })
  it("ghi rồi đọc lại không mất trường nào (hai màn cài đặt cùng ghi brochure_policy)", () => {
    const p = {
      depositPercent: 30,
      requirePaidBeforeProduction: true,
      requireFullBeforeDispatch: true,
      requirePaymentProof: true,
      requireProductPhotoQC: true,
      requireRecipientPhoto: true,
      cancellationApprovalTimeoutMinutes: 15,
      holidayAutoMode: false,
      autoApprovePaymentWithProof: false,
      autoApprovePaymentWithProofMinutes: 15,
      productPhotoReviewMinutes: 10,
      allowShipperCash: false,
      aiReadPaymentProof: false,
      holdMinutes: 15,
      autoCancelUnpaid: true,
      paymentTimeoutMinutes: 30,
      trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR" as const,
      // balancePaymentTriggerPolicy kế thừa từ trackingTriggerPolicy khi không cài riêng
      balancePaymentTriggerPolicy: "PAYMENT_OR_COORDINATOR" as const,
    }
    expect(parsePaymentPolicy({ brochure_policy: serializePaymentPolicy(p) })).toEqual(p)
  })
  it("applyHolidayAutoPreset: bật chuyển sang chế độ cao điểm, tắt chuyển về chuẩn", () => {
    const base = parsePaymentPolicy(null)
    const holiday = applyHolidayAutoPreset(base, true)
    expect(holiday.holidayAutoMode).toBe(true)
    expect(holiday.trackingTriggerPolicy).toBe("PAYMENT_OR_COORDINATOR")
    expect(holiday.balancePaymentTriggerPolicy).toBe("PAYMENT_OR_COORDINATOR")
    expect(holiday.autoApprovePaymentWithProof).toBe(true)
    expect(holiday.cancellationApprovalTimeoutMinutes).toBe(30)
    expect(holiday.paymentTimeoutMinutes).toBe(30)
    expect(holiday.requireProductPhotoQC).toBe(false)
    expect(holiday.requireRecipientPhoto).toBe(false)

    const normal = applyHolidayAutoPreset(holiday, false)
    expect(normal.holidayAutoMode).toBe(false)
    expect(normal.cancellationApprovalTimeoutMinutes).toBe(15)
    expect(normal.requireProductPhotoQC).toBe(true)
    expect(normal.requireRecipientPhoto).toBe(true)
  })
  it("balancePaymentTriggerPolicy có thể cài riêng độc lập với trackingTriggerPolicy", () => {
    const p = {
      depositPercent: 50,
      requirePaidBeforeProduction: false,
      requireFullBeforeDispatch: true,
      requirePaymentProof: true,
      trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR" as const,
      balancePaymentTriggerPolicy: "PAYMENT_ONLY" as const,
    }
    const parsed = parsePaymentPolicy({ brochure_policy: serializePaymentPolicy(p) })
    expect(parsed.trackingTriggerPolicy).toBe("PAYMENT_OR_COORDINATOR")
    expect(parsed.balancePaymentTriggerPolicy).toBe("PAYMENT_ONLY")
  })
  it("hạn thanh toán thắng giữ đơn khi tính hạn hiện cho khách", () => {
    const createdAt = new Date("2026-10-08T03:00:00Z")
    expect(paymentHoldUntil({ depositPercent: 0, requirePaidBeforeProduction: false, requireFullBeforeDispatch: false, holdMinutes: 120, paymentTimeoutMinutes: 30 }, { paidVnd: 0, createdAt }))
      .toBe("2026-10-08T03:30:00.000Z")
  })
})

describe("resolveRequirePaymentProof", () => {
  const policy = { depositPercent: 0, requirePaidBeforeProduction: false, requireFullBeforeDispatch: false, requirePaymentProof: true }

  it("ưu tiên cài đặt bộ sưu tập khi có chỉ định rõ ràng", () => {
    expect(resolveRequirePaymentProof(policy, { requirePaymentProof: false })).toBe(false)
    expect(resolveRequirePaymentProof({ ...policy, requirePaymentProof: false }, { requirePaymentProof: true })).toBe(true)
  })

  it("dùng chính sách tiệm khi bộ sưu tập không ghi đè", () => {
    expect(resolveRequirePaymentProof(policy, {})).toBe(true)
    expect(resolveRequirePaymentProof(policy, null)).toBe(true)
    expect(resolveRequirePaymentProof({ ...policy, requirePaymentProof: false }, {})).toBe(false)
  })
})

describe("resolveTrackingTriggerPolicy", () => {
  const defaultPolicy = {
    depositPercent: 0,
    requirePaidBeforeProduction: false,
    requireFullBeforeDispatch: false,
    requirePaymentProof: true,
    trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR" as const,
  }

  it("ưu tiên ghi đè ở bộ sưu tập khi có chỉ định PAYMENT_ONLY hoặc PAYMENT_OR_COORDINATOR", () => {
    expect(resolveTrackingTriggerPolicy(defaultPolicy, { trackingTriggerPolicy: "PAYMENT_ONLY" })).toBe("PAYMENT_ONLY")
    expect(resolveTrackingTriggerPolicy({ ...defaultPolicy, trackingTriggerPolicy: "PAYMENT_ONLY" }, { trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR" })).toBe("PAYMENT_OR_COORDINATOR")
  })

  it("kế thừa từ cài đặt cửa hàng khi bộ sưu tập không ghi đè", () => {
    expect(resolveTrackingTriggerPolicy(defaultPolicy, {})).toBe("PAYMENT_OR_COORDINATOR")
    expect(resolveTrackingTriggerPolicy({ ...defaultPolicy, trackingTriggerPolicy: "PAYMENT_ONLY" }, {})).toBe("PAYMENT_ONLY")
    expect(resolveTrackingTriggerPolicy(defaultPolicy, null)).toBe("PAYMENT_OR_COORDINATOR")
  })
})


describe("shipper thu tiền mặt (PO 14/10/2026)", () => {
  const deposit = { totalVnd: 1_000_000, paidVnd: 500_000 }

  it("mặc định TẮT: đơn đặt cọc chưa thu lần 2 không được giao ship (khách phải chuyển khoản)", () => {
    const policy = parsePaymentPolicy({ brochure_policy: { require_full_before_dispatch: false } })
    expect(policy.allowShipperCash).toBe(false)
    expect(paymentGateBlocker("dispatch-shipping", policy, deposit)).toMatch(/lần 2/)
  })

  it("BẬT: shipper thu phần còn lại khi giao → được giao ship", () => {
    const policy = parsePaymentPolicy({ brochure_policy: { require_full_before_dispatch: false, allow_shipper_cash: true } })
    expect(paymentGateBlocker("dispatch-shipping", policy, deposit)).toBeNull()
  })

  it("BẬT nhưng tiệm bắt thu đủ trước khi giao → vẫn chặn", () => {
    const policy = parsePaymentPolicy({ brochure_policy: { require_full_before_dispatch: true, allow_shipper_cash: true } })
    expect(paymentGateBlocker("dispatch-shipping", policy, deposit)).not.toBeNull()
  })
})
