import { describe, it, expect } from "vitest"
import { catalogPolicyKeysChanged } from "../catalog-policy-keys"

/** Sale (quyền tạo đơn) sửa được hiển thị bộ sưu tập, nhưng đổi chính sách tiệm theo bộ sưu tập thì cần quyền cấu hình tiệm. */
describe("catalogPolicyKeysChanged", () => {
  it("chỉ đổi khoá hiển thị → không coi là đổi chính sách", () => {
    expect(catalogPolicyKeysChanged({ templateId: "a", requirePaymentProof: true }, { templateId: "b", requirePaymentProof: true })).toBe(false)
  })

  it("tắt bắt buộc ảnh bill / đổi cơ chế duyệt / thời hạn tự huỷ → đổi chính sách", () => {
    expect(catalogPolicyKeysChanged({ requirePaymentProof: true }, { requirePaymentProof: false })).toBe(true)
    expect(catalogPolicyKeysChanged({}, { trackingTriggerPolicy: "PAYMENT_OR_COORDINATOR" })).toBe(true)
    expect(catalogPolicyKeysChanged(null, { stepTimeoutOverride: { unopenedExpiryHours: 1 } })).toBe(true)
  })

  it("không có filters → không đổi", () => {
    expect(catalogPolicyKeysChanged(null, null)).toBe(false)
  })
})
