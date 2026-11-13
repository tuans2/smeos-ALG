import { describe, expect, it } from "vitest"
import { canEnterCustomerStep, canViewTracking, resumeCustomerStep, resumePublicStep, sanitizeVariant } from "../customer-step"

/** Mở lại trang thì về đúng bước khách đã dừng — mỗi ca khớp một dòng trong bảng rà soát. */
describe("link riêng /b — về đúng bước khi mở lại", () => {
  const noOrder = { hasOrder: false, hasSnapshot: true, trackingUnlocked: false, serverStep: "ORDER_FORM" as const }

  it("đã chọn mẫu nhưng quay lại xem mẫu khác → về xem mẫu, không bị ép vào form", () => {
    expect(resumeCustomerStep("SWIPING", noOrder)).toBe("SWIPING")
  })

  it("đang điền form → về form; chưa chọn mẫu thì không vào form", () => {
    expect(resumeCustomerStep("ORDER_FORM", { ...noOrder, serverStep: "SWIPING" })).toBe("ORDER_FORM")
    expect(resumeCustomerStep("ORDER_FORM", { ...noOrder, hasSnapshot: false, serverStep: "SWIPING" })).toBeNull()
  })

  it("chưa có đơn thì không vào bước thanh toán / theo dõi", () => {
    expect(resumeCustomerStep("PAYMENT", noOrder)).toBeNull()
    expect(resumeCustomerStep("TRACKING", noOrder)).toBeNull()
  })

  it("có đơn đã được xác nhận nhận cọc: đang ở Theo dõi → về Theo dõi; không về xem mẫu / form", () => {
    const unpaid = { hasOrder: true, hasSnapshot: true, trackingUnlocked: true, serverStep: "PAYMENT" as const }
    expect(resumeCustomerStep("TRACKING", unpaid)).toBe("TRACKING")
    expect(resumeCustomerStep("SWIPING", unpaid)).toBeNull()
    expect(resumeCustomerStep("ORDER_FORM", unpaid)).toBeNull()
  })

  it("đơn đã trả đủ / đã huỷ → luôn ở Theo dõi, không quay lại thanh toán", () => {
    expect(resumeCustomerStep("PAYMENT", { hasOrder: true, hasSnapshot: true, trackingUnlocked: true, serverStep: "TRACKING" })).toBeNull()
  })

  it("chưa chuyển khoản: mở lại hay Back/Forward đều không vào được Theo dõi, ở lại thanh toán", () => {
    const notPaid = { hasOrder: true, hasSnapshot: true, trackingUnlocked: false }
    expect(resumeCustomerStep("TRACKING", { ...notPaid, serverStep: "PAYMENT" })).toBeNull()
    expect(canEnterCustomerStep("TRACKING", notPaid)).toBe(false)
    expect(canEnterCustomerStep("PAYMENT", notPaid)).toBe(true)
  })
})

describe("canViewTracking — phải chuyển khoản mới xem tiến độ (PO 08/10/2026)", () => {
  const base = { totalVnd: 650_000, paidVnd: 0, hasPaymentQr: true, cancelled: false }

  it("có mã QR, chưa báo, tiệm chưa nhận tiền → không xem được", () => {
    expect(canViewTracking(base)).toBe(false)
  })

  it("khách mới báo chuyển khoản, Điều hành chưa xác nhận → chưa xem được", () => {
    expect(canViewTracking({ ...base, paidVnd: 0 })).toBe(false)
  })

  it("Điều hành đã xác nhận nhận tiền (kể cả cọc) → xem được", () => {
    expect(canViewTracking({ ...base, paidVnd: 200_000 })).toBe(true)
    expect(canViewTracking({ ...base, paidVnd: 650_000 })).toBe(true)
  })

  it("không có gì để chuyển: đơn huỷ, chờ báo giá, tiệm chưa có tài khoản nhận tiền → xem được", () => {
    expect(canViewTracking({ ...base, cancelled: true })).toBe(true)
    expect(canViewTracking({ ...base, totalVnd: 0 })).toBe(true)
    expect(canViewTracking({ ...base, hasPaymentQr: false })).toBe(true)
  })

  it("Điều phối đã xác nhận nhận đơn (kể cả khi tiền chưa duyệt) → xem được tiến độ khi chính sách mặc định là PAYMENT_OR_COORDINATOR", () => {
    expect(canViewTracking({ ...base, orderStatus: "CONFIRMED" })).toBe(true)
    expect(canViewTracking({ ...base, productionStatus: "ASSIGNED" })).toBe(true)
    expect(canViewTracking({ ...base, productionStatus: "ARRANGING" })).toBe(true)
  })

  it("chính sách PAYMENT_ONLY: bắt buộc phải có tiền mới kích hoạt theo dõi tiến độ", () => {
    // Điều phối đã nhận đơn nhưng chưa có tiền → CHẶN (false)
    expect(canViewTracking({ ...base, orderStatus: "CONFIRMED", triggerPolicy: "PAYMENT_ONLY" })).toBe(false)
    expect(canViewTracking({ ...base, productionStatus: "ASSIGNED", triggerPolicy: "PAYMENT_ONLY" })).toBe(false)
    // Đã có tiền cọc hoặc trả đủ → CHO PHÉP (true)
    expect(canViewTracking({ ...base, paidVnd: 200_000, triggerPolicy: "PAYMENT_ONLY" })).toBe(true)
  })
})

describe("link chung /g · /bst — về đúng bước khi mở lại", () => {
  const products = [{ id: "a" }, { id: "b", available: false }]

  it("đang xem mẫu đã chọn / điền form → về đúng bước nếu mẫu còn bán", () => {
    expect(resumePublicStep("PREVIEW", "a", products)).toBe("PREVIEW")
    expect(resumePublicStep("ORDER_FORM", "a", products)).toBe("ORDER_FORM")
  })

  it("mẫu đã gỡ hoặc hết hàng → về xem mẫu", () => {
    expect(resumePublicStep("ORDER_FORM", "b", products)).toBeNull()
    expect(resumePublicStep("ORDER_FORM", "x", products)).toBeNull()
    expect(resumePublicStep("ORDER_FORM", null, products)).toBeNull()
  })

  it("bước của đơn không khôi phục ở đây (đã chuyển sang trang đơn)", () => {
    expect(resumePublicStep("PAYMENT", "a", products)).toBeNull()
  })
})

describe("lựa chọn trong form", () => {
  it("giữ size đã chọn; size đã bị gỡ thì về bản gốc", () => {
    const sel = { variantId: "v1", quantity: 2, shippingZoneId: "z", voucherCode: "GIAM" }
    expect(sanitizeVariant(sel, ["v1"])).toBe(sel)
    expect(sanitizeVariant(sel, ["v2"])).toEqual({ ...sel, variantId: "" })
  })
})
