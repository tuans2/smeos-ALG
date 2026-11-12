/**
 * Hạn lưu theo loại dữ liệu (ADR-014 D-P4, bước P-6a). Mốc và cờ thực thi nằm ở bảng `retention_policies` (PO đổi
 * không cần sửa mã); ở đây chỉ có danh sách loại dữ liệu mã đã biết xử lý, hành động đúng của từng loại và giờ chạy.
 * Không import hạ tầng.
 */
export const RETENTION_ACTIONS = ["DELETE", "ANONYMIZE"] as const
export type RetentionAction = (typeof RETENTION_ACTIONS)[number]

/**
 * Loại dữ liệu job biết xử lý và hành động duy nhất được phép cho từng loại (đổi hành động là đổi luật, cần sửa mã):
 * - `technical_logs`: `job_events`, thông báo trong ứng dụng, `link_events`, sự kiện catalog — xoá.
 * - `delivery_info`: người nhận, điện thoại, địa chỉ giao trên đơn đã hoàn tất hoặc huỷ — ẩn danh, giữ thông tin VAT.
 * - `audit_logs`: `audit_logs`, `platform_audit_logs`, `platform_access_logs` — xoá.
 * - `customer_conversations`: hội thoại khách (xoá tin nhắn, giữ vỏ), lead không thành đơn, phiên Thẻ chào không đặt —
 *   ẩn danh sau lần tương tác cuối.
 * - `customer_profiles`: hồ sơ khách không có hoạt động nào — ẩn danh (giữ đơn, phiếu thu, hoá đơn VAT).
 * - `non_ledger_documents`: báo giá, đơn huỷ chưa thu đồng nào — xoá.
 * Chứng từ ghi sổ 10 năm chưa làm (PO 12/11/2026: chờ pháp lý xác nhận mốc).
 */
export const RETENTION_CATEGORIES = {
  technical_logs: "DELETE",
  delivery_info: "ANONYMIZE",
  audit_logs: "DELETE",
  customer_conversations: "ANONYMIZE",
  customer_profiles: "ANONYMIZE",
  non_ledger_documents: "DELETE",
} as const satisfies Record<string, RetentionAction>
export type RetentionCategory = keyof typeof RETENTION_CATEGORIES

export interface RetentionPolicy {
  category: string
  retentionMonths: number
  action: RetentionAction
  enforce: boolean
}

/** Số dòng mỗi lô và trần số lô mỗi bảng mỗi lượt — vòng lặp luôn có giới hạn; còn dư thì đêm sau xử lý tiếp. */
export const RETENTION_BATCH_SIZE = 5_000
export const RETENTION_MAX_BATCHES = 200

export function isRetentionCategory(category: string): category is RetentionCategory {
  return Object.hasOwn(RETENTION_CATEGORIES, category)
}

/** Lý do bỏ qua một dòng chính sách, hoặc `null` khi job chạy được. */
export function policySkipReason(policy: RetentionPolicy): string | null {
  if (!isRetentionCategory(policy.category)) return "loại dữ liệu chưa được hỗ trợ"
  if (RETENTION_CATEGORIES[policy.category] !== policy.action) return `loại này chỉ hỗ trợ ${RETENTION_CATEGORIES[policy.category]}`
  if (!Number.isInteger(policy.retentionMonths) || policy.retentionMonths < 1) return "hạn lưu không hợp lệ"
  return null
}

/** Mốc cắt: dữ liệu cũ hơn mốc này là quá hạn. Lùi theo tháng lịch (UTC); ngày 31 rơi vào tháng ngắn thì lấy ngày cuối. */
export function retentionCutoff(now: Date, months: number): Date {
  const cutoff = new Date(now)
  const day = cutoff.getUTCDate()
  cutoff.setUTCDate(1)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)
  const lastDay = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate()
  cutoff.setUTCDate(Math.min(day, lastDay))
  return cutoff
}

const VN_OFFSET_MS = 7 * 60 * 60 * 1000
const MIN_GAP_MS = 20 * 60 * 60 * 1000

/** Job chạy ban đêm giờ Việt Nam (1–5 giờ sáng) và cách lần chạy trước ít nhất 20 giờ — mỗi đêm một lần. */
export function isRetentionDue(now: Date, lastRunAt: Date | null): boolean {
  const hour = new Date(now.getTime() + VN_OFFSET_MS).getUTCHours()
  if (hour < 1 || hour >= 5) return false
  return lastRunAt === null || now.getTime() - lastRunAt.getTime() >= MIN_GAP_MS
}
