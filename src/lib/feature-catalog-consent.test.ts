import { describe, expect, it } from "vitest"
import { checkFeatureDependencies, getFeatureByKey } from "./feature-catalog"

/**
 * Audit L-06 (12/11/2026): FeaturePicker gán cứng "khách đã đồng ý" = false nên "Tin nhắn nhắc mua lại (AI)" luôn bị khoá.
 * Đồng ý là của từng khách — trang tính năng của một sản phẩm không có khách cụ thể. Không khoá ở đây; khách chưa đồng ý
 * bị loại khi lập danh sách gửi (`projectMarketingAudience`, `projectOccasionReminder` — `tests/unit/crm/crm-rules.test.ts`).
 */
describe("checkFeatureDependencies — đồng ý của khách", () => {
  const ready = { hasApprovedAnalysis: true, hasApprovedMasterImage: true }

  it("nhắc mua lại không bị khoá vì đồng ý, kèm ghi chú chỉ gửi cho khách đã đồng ý", () => {
    const reminder = getFeatureByKey("customer.reminder_message")!
    expect(reminder.requiresConsent).toBe(true)
    const check = checkFeatureDependencies(reminder, ready)
    expect(check.canRun).toBe(true)
    expect(check.reason).toMatch(/đã đồng ý nhận tin/)
  })

  it("điều kiện khác vẫn khoá như cũ (thiếu kết quả duyệt / Master Image)", () => {
    const feature = { key: "x", requiresApprovedInput: "Phân tích ảnh", requiresConsent: true } as unknown as Parameters<typeof checkFeatureDependencies>[0]
    expect(checkFeatureDependencies(feature, { hasApprovedAnalysis: false, hasApprovedMasterImage: true }).canRun).toBe(false)
  })

  it("chức năng không cần đồng ý: không có ghi chú", () => {
    const plain = { key: "y" } as unknown as Parameters<typeof checkFeatureDependencies>[0]
    expect(checkFeatureDependencies(plain, ready)).toEqual({ canRun: true })
  })
})
