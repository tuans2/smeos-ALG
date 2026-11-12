/**
 * Câu báo khi lượt AI có thu credit không ra kết quả (audit BL-32, BL-33 — 11/11/2026). Chỉ nói "đã hoàn credit" khi
 * hoàn thật; hoàn ngay không được thì bộ quét `refundDueJobs` hoàn trong lượt quét kế tiếp (5 phút). Không đưa lỗi
 * thô của nhà cung cấp hay tên kỹ thuật ra màn hình — lỗi gốc đã ghi ở `generation_jobs.error`. Thuần.
 */
export function aiFailureMessage(what: string, refunded: boolean): string {
  return `${what} — ${refunded ? "đã hoàn credit" : "credit sẽ được hoàn tự động trong ít phút"}, vui lòng thử lại.`
}
