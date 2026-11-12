/**
 * Xoá hẳn một tổ chức (ADR-016 D-S5, bước S-3b; PO 11/11/2026) — luật thuần, không import Prisma.
 *
 * Điều kiện: tổ chức đang `OFFBOARDING`, đã qua `offboarding_until`, không còn legal hold.
 * Giữ lại (ADR-014 D-P4): chứng từ ghi sổ — đơn đã thu tiền kèm dòng đơn, phiếu thu, người nhận (chỉ còn thông tin hoá
 * đơn VAT), sổ credit, `usage`, gói và hoá đơn thuê bao, khoá dữ liệu (để đọc lại hoá đơn VAT đã mã hoá) — cùng nhật ký
 * kiểm toán / truy cập và hàng đợi xoá tệp. Khách còn được đơn giữ lại tham chiếu thì ẩn danh. Mọi bảng thuộc tổ chức
 * khác: xoá dòng của tổ chức này.
 */

/** Bảng giữ nguyên toàn bộ dòng của tổ chức. */
export const PURGE_KEEP_TABLES: ReadonlySet<string> = new Set([
  "audit_logs",
  "platform_access_logs",
  "credit_transactions",
  "usage",
  "subscriptions",
  "subscription_invoices",
  "provider_cost_entries",
  "reconciliation_findings",
  "tenant_data_keys",
  "storage_outbox",
  "workspaces", // `usage.workspace_id` bắt buộc
])

/** Bảng chỉ giữ phần thuộc đơn đã thu tiền (lọc theo `order_id` / `id`). */
export const PURGE_KEEP_WITH_PAID_ORDERS: ReadonlySet<string> = new Set(["orders", "order_items", "order_payments", "order_recipients"])

export const ERASED_CUSTOMER_NAME = "Khách đã xoá"
export const ERASED_MARKER = "ERASED"

export interface PurgeTarget {
  lifecycleStatus: string
  offboardingUntil: Date | null
  legalHoldUntil: Date | null
}

/** Lý do không được xoá (tiếng Việt), hoặc `null` khi đủ điều kiện. */
export function purgeBlockedReason(org: PurgeTarget | null, now: Date): string | null {
  if (!org) return "Không tìm thấy tổ chức"
  if (org.lifecycleStatus === "DELETED") return "Tổ chức đã được xoá"
  if (org.lifecycleStatus !== "OFFBOARDING") return "Chỉ xoá tổ chức đang ở trạng thái rời nền tảng"
  if (!org.offboardingUntil || org.offboardingUntil > now) return "Chưa hết hạn giữ dữ liệu sau khi rời nền tảng"
  if (org.legalHoldUntil && org.legalHoldUntil > now) return "Tổ chức đang bị giữ pháp lý (legal hold)"
  return null
}
