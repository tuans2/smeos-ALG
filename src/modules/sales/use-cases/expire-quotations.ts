import { log } from "@/core/observability/log"
import { expireOverdueQuotationRows } from "../infra/quotation-expiry"

/** Trần mỗi lượt quét 5 phút — dư thì lượt sau làm tiếp. */
export const QUOTATION_EXPIRY_BATCH = 500

/**
 * Hết hạn báo giá chạy theo lịch (audit hành trình Q2/S1, gói UJ-11) — trước đây chỉ ghi khi nhân viên mở chi
 * tiết, nên danh sách và số liệu "đã gửi" lệch. Lỗi không làm hỏng lượt quét chung: ghi log, trả `null`.
 */
export async function expireOverdueQuotations(now: Date = new Date()): Promise<number | null> {
  try {
    return await expireOverdueQuotationRows(now, QUOTATION_EXPIRY_BATCH)
  } catch (error) {
    log.error("sweep.quotation_expiry_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
