/**
 * Khách duyệt ảnh thành phẩm trước khi giao (PO 15/10/2026, mục 4). Thuần domain.
 * - BYPASS: không chờ khách.
 * - AUTO_PASS_10M: chờ theo số phút tiệm/bộ sưu tập cài (mặc định 10), hết giờ tự coi như đồng ý.
 * - REQUIRE_CUSTOMER: chờ khách bấm duyệt; khách im lặng thì tự qua sau 30 phút.
 * Khách góp ý (checklist ALG 5.13) → dừng đồng hồ, không tự qua, chặn giao tới khi cửa hàng chụp lại ảnh.
 */
import { parseBrochureWorkflowPolicy, type CustomerApprovalMode } from "./brochure-workflow-policy"

export const REQUIRE_CUSTOMER_WAIT_MINUTES = 30
export const DEFAULT_PHOTO_REVIEW_MINUTES = 10

export type PhotoApprovalStatus = "NONE" | "BYPASSED" | "PENDING" | "FEEDBACK" | "APPROVED" | "AUTO_APPROVED"

export const CUSTOMER_PHOTO_FEEDBACK = "CUSTOMER_PHOTO_FEEDBACK"

export interface PhotoApprovalState {
  status: PhotoApprovalStatus
  uploadedAt: string | null
  /** Số phút chờ áp dụng cho đơn này */
  countdownMinutes: number
  approvedAt: string | null
  /** Còn bao lâu (ms) thì tự qua — chỉ khi PENDING */
  remainingMs: number
}

export function photoWaitMinutes(mode: CustomerApprovalMode, reviewMinutes: number | null | undefined): number {
  const configured = reviewMinutes && reviewMinutes > 0 ? reviewMinutes : DEFAULT_PHOTO_REVIEW_MINUTES
  return mode === "REQUIRE_CUSTOMER" ? Math.max(REQUIRE_CUSTOMER_WAIT_MINUTES, configured) : configured
}

export function photoApprovalState(input: {
  mode: CustomerApprovalMode
  reviewMinutes?: number | null | undefined
  /** Lúc tải ảnh thành phẩm; `null` = chưa có ảnh (chưa tải hoặc đã bỏ qua ảnh) */
  uploadedAt: Date | null
  customerApprovedAt: Date | null
  /** Lần khách góp ý gần nhất; chỉ tính khi sau lần tải ảnh mới nhất */
  feedbackAt?: Date | null | undefined
  now: Date
}): PhotoApprovalState {
  const countdownMinutes = photoWaitMinutes(input.mode, input.reviewMinutes)
  const base = { countdownMinutes, uploadedAt: input.uploadedAt?.toISOString() ?? null, approvedAt: null, remainingMs: 0 }
  if (!input.uploadedAt) return { ...base, status: "NONE" }
  if (input.mode === "BYPASS") return { ...base, status: "BYPASSED" }
  if (input.customerApprovedAt) return { ...base, status: "APPROVED", approvedAt: input.customerApprovedAt.toISOString() }
  if (input.feedbackAt && input.feedbackAt >= input.uploadedAt) return { ...base, status: "FEEDBACK" }
  const autoAt = input.uploadedAt.getTime() + countdownMinutes * 60_000
  if (input.now.getTime() >= autoAt) return { ...base, status: "AUTO_APPROVED", approvedAt: new Date(autoAt).toISOString() }
  return { ...base, status: "PENDING", remainingMs: autoAt - input.now.getTime() }
}

/** Lý do chặn giao ship khi còn chờ khách duyệt ảnh, hoặc `null`. */
export function photoApprovalDispatchBlocker(state: PhotoApprovalState): string | null {
  if (state.status === "FEEDBACK") return "Khách đã góp ý ảnh thành phẩm — chỉnh theo góp ý và chụp lại ảnh trước khi giao"
  if (state.status !== "PENDING") return null
  const minutes = Math.max(1, Math.ceil(state.remainingMs / 60_000))
  return `Đang chờ khách duyệt ảnh thành phẩm — còn ${minutes} phút (hết giờ tự duyệt)`
}

/** Đọc mốc ảnh từ `qc_records` của đơn. */
export function photoMilestonesOf(qcRecords: readonly { notes: string | null; created_at: Date }[]): { uploadedAt: Date | null; customerApprovedAt: Date | null; feedbackAt: Date | null } {
  // Lần tải ảnh MỚI NHẤT (Điều phối có thể chụp lại) — không phụ thuộc thứ tự truy vấn
  const latest = (note: string) =>
    qcRecords.filter((qc) => qc.notes === note).reduce<Date | null>((max, qc) => (!max || qc.created_at > max ? qc.created_at : max), null)
  return { uploadedAt: latest("PRODUCT_PHOTO_UPLOADED"), customerApprovedAt: latest("CUSTOMER_PHOTO_APPROVED"), feedbackAt: latest(CUSTOMER_PHOTO_FEEDBACK) }
}

/** Số phút chờ tiệm cài: bộ sưu tập ghi đè cài đặt tiệm. */
export function photoReviewMinutesOf(catalogFilters: unknown, storeReviewMinutes: number | null | undefined): number | null {
  const applied = (catalogFilters as { appliedPolicies?: { photoApprovalCountdownMinutes?: unknown } } | null | undefined)?.appliedPolicies
  const fromCatalog = applied?.photoApprovalCountdownMinutes
  return typeof fromCatalog === "number" ? fromCatalog : storeReviewMinutes ?? null
}

/** Trạng thái khách duyệt ảnh thành phẩm của một đơn theo chế độ tiệm chọn (mục 4, PO 15/10/2026). */
export function orderPhotoApproval(
  order: { qc_records: { notes: string | null; created_at: Date }[]; greeting_sessions?: { catalog?: { filters: unknown } | null }[] | undefined },
  shopSettings: unknown,
  storeReviewMinutes: number | null | undefined,
  now: Date,
) {
  const catalogFilters = order.greeting_sessions?.find((s) => s.catalog?.filters)?.catalog?.filters
  return photoApprovalState({
    mode: parseBrochureWorkflowPolicy(shopSettings).customerApprovalMode,
    reviewMinutes: photoReviewMinutesOf(catalogFilters, storeReviewMinutes),
    ...photoMilestonesOf(order.qc_records),
    now,
  })
}
