import { describe, expect, it } from "vitest"

import { qcAiOutcome } from "../qc-ai-outcome"

/** PO 22/10/2026: AI lỗi → cho qua kèm ghi chú; AI xác nhận sai mẫu → chặn. */
describe("kết quả AI kiểm ảnh thành phẩm (1 cửa hàng)", () => {
  it("AI không chạy được hoặc lỗi: cho qua, ghi chú bỏ qua", () => {
    expect(qcAiOutcome(null)).toEqual({ blockReason: null, note: "[AI Bỏ qua — lỗi kết nối]" })
    expect(qcAiOutcome({ isMatch: false, confidenceScore: 0, verdict: "UNCERTAIN", reason: "AI lỗi" }).blockReason).toBeNull()
  })

  it("AI xác nhận sai mẫu: chặn; khớp: cho qua kèm điểm", () => {
    expect(qcAiOutcome({ isMatch: false, confidenceScore: 20, verdict: "MISMATCH", reason: "Khác màu" }).blockReason).toMatch(/không khớp/)
    expect(qcAiOutcome({ isMatch: true, confidenceScore: 92, verdict: "MATCH", reason: "Đúng mẫu" })).toEqual({ blockReason: null, note: "[AI ✅ 92%] Đúng mẫu" })
  })
})
