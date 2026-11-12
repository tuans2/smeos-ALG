/**
 * Yêu cầu của khách về dữ liệu cá nhân của mình (ADR-014 D-P5, bước P-7a). Không import hạ tầng.
 * - `EXPORT`: gói JSON mọi bản ghi cá nhân của khách trong tổ chức — xử lý ngay.
 * - `ERASE`: ẩn danh xuyên bảng, giữ dòng tài chính (đơn, phiếu thu, hoá đơn VAT) — xử lý ngay. Tổ chức được chia sẻ đơn
 *   đọc theo tham chiếu (`shared_order_access`, D-P6) nên thấy bản đã ẩn danh, không cần sửa nơi khác.
 * - `RECTIFY`: ghi nhận; nhân viên sửa hồ sơ khách rồi đóng yêu cầu.
 */
export const DSR_TYPES = ["EXPORT", "ERASE", "RECTIFY"] as const
export type DsrType = (typeof DSR_TYPES)[number]
export const DSR_STATUSES = ["RECEIVED", "COMPLETED", "REJECTED"] as const
export type DsrStatus = (typeof DSR_STATUSES)[number]

/**
 * Hạn xử lý: 72 giờ từ lúc tiếp nhận — theo thực hành phổ biến với Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân,
 * **chưa phải ý kiến pháp lý** (như mốc hạn lưu ở D-P4).
 */
export const DSR_DUE_HOURS = 72

export function dsrDueAt(receivedAt: Date): Date {
  return new Date(receivedAt.getTime() + DSR_DUE_HOURS * 60 * 60 * 1000)
}

/** Chỉ yêu cầu đang chờ (`RECEIVED`) mới đóng được; kết quả chỉ là hoàn tất hoặc từ chối. */
export function canResolve(status: DsrStatus, next: DsrStatus): boolean {
  return status === "RECEIVED" && (next === "COMPLETED" || next === "REJECTED")
}

export interface DataSubjectRequestView {
  id: string
  customerId: string | null
  type: DsrType
  status: DsrStatus
  receivedBy: string
  receivedAt: string
  dueAt: string
  overdue: boolean
  note: string | null
  completedBy: string | null
  completedAt: string | null
  /** Số dòng theo bảng — không chứa dữ liệu cá nhân. */
  result: Record<string, number> | null
}
