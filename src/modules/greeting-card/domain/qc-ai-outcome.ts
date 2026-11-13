/**
 * Kết quả AI kiểm ảnh thành phẩm ở luồng 1 cửa hàng → chặn hay cho qua (PO 22/10/2026, rà soát cụm H):
 * AI xác nhận sai mẫu → chặn; AI lỗi / không chạy được (UNCERTAIN hoặc không có kết quả) → cho qua kèm
 * ghi chú để Điều phối biết ảnh chưa được AI kiểm.
 */
export interface QcAiVerdict {
  isMatch: boolean
  confidenceScore: number
  verdict: string
  reason: string
}

export function qcAiOutcome(ai: QcAiVerdict | null): { blockReason: string | null; note: string } {
  if (!ai || ai.verdict === "UNCERTAIN") return { blockReason: null, note: "[AI Bỏ qua — lỗi kết nối]" }
  if (!ai.isMatch) {
    return {
      blockReason: `❌ AI kiểm định phát hiện ảnh thành phẩm không khớp với mẫu sản phẩm: ${ai.reason} (Độ tin cậy: ${ai.confidenceScore}%). Vui lòng kiểm tra và chụp đúng sản phẩm của đơn hàng này!`,
      note: "",
    }
  }
  return { blockReason: null, note: `[AI ✅ ${ai.confidenceScore}%] ${ai.reason}` }
}
