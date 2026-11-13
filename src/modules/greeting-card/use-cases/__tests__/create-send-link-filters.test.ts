import { describe, it, expect, vi } from "vitest"

vi.mock("../get-shop-contact", () => ({ assertShopReadyForCustomers: vi.fn() }))

import { displayFiltersOnly } from "../create-send-link"

/** Người tạo link nhanh không được ghi đè chính sách tiệm (vd tắt bắt buộc ảnh bill) qua filters của bộ sưu tập. */
describe("displayFiltersOnly", () => {
  it("chỉ giữ khoá hiển thị, bỏ khoá chính sách", () => {
    expect(
      displayFiltersOnly({
        templateId: "editorial-luxury",
        occasion: "Sinh nhật",
        requirePaymentProof: false,
        trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR",
        balancePaymentTriggerPolicy: "PAYMENT_OR_COORDINATOR",
      })
    ).toEqual({ templateId: "editorial-luxury", occasion: "Sinh nhật" })
  })

  it("không có khoá hiển thị nào → null", () => {
    expect(displayFiltersOnly({ requirePaymentProof: false })).toBeNull()
    expect(displayFiltersOnly(null)).toBeNull()
  })
})
