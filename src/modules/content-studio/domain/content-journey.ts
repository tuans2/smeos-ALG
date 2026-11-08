/**
 * Hành trình 4 bước của nhóm "Tạo nội dung" trên /cong-cu (PO 08/11/2026):
 *   1. Thẻ sản phẩm — tải ảnh → quét ảnh → Thẻ sản phẩm → Bài giới thiệu (user duyệt từng phần).
 *   2. Thẻ chào sản phẩm — dựng từ dữ liệu đã duyệt ở Bước 1, chốt lại thì lưu vào Kho sản phẩm.
 *   3. Bài đăng đa kênh — từ Thẻ sản phẩm + Bài giới thiệu + Thẻ chào.
 *   4. Đăng tự động — kết nối kênh, chọn bài, lên lịch.
 *
 * Hành trình xoay quanh MỘT "sản phẩm đang làm". Chưa chọn sản phẩm: Bước 2–4 vẫn mở để chọn từ Kho
 * (tình huống "lấy dữ liệu có sẵn"). Đã chọn: bước sau chỉ mở khi dữ liệu bước trước đã duyệt — máy chủ
 * kiểm lại bằng `contentLockedReason` (không tin giao diện). Bước 4 không khoá: luôn chọn được bài có sẵn.
 * Thuần — không import hạ tầng.
 */
import type { JourneyStepStatus } from "@/modules/journey/domain/journey-model"

export const CONTENT_STEPS = ["PRODUCT_CARD", "SALES_PITCH", "CHANNEL_POSTS", "AUTO_PUBLISH"] as const
export type ContentStep = (typeof CONTENT_STEPS)[number]

export const CONTENT_STEP_LABELS: Readonly<Record<ContentStep, string>> = {
  PRODUCT_CARD: "Thẻ sản phẩm",
  SALES_PITCH: "Thẻ chào sản phẩm",
  CHANNEL_POSTS: "Bài đăng đa kênh",
  AUTO_PUBLISH: "Đăng tự động",
}

/** Dữ liệu đã duyệt của sản phẩm đang làm — `null` khi chưa chọn sản phẩm nào. */
export interface ContentProductFlags {
  /** Kết quả quét ảnh đã duyệt (Thẻ sản phẩm) */
  readonly cardApproved: boolean
  /** Bài giới thiệu sản phẩm đã duyệt */
  readonly copyApproved: boolean
  /** Thẻ chào sản phẩm đã chốt và lưu vào Kho */
  readonly pitchSaved: boolean
  /** Số bài đăng đa kênh đã duyệt */
  readonly approvedPosts: number
}

/** Cờ trên API (snake_case, chuẩn API Contract v1.1). */
export interface ContentFlagsWire {
  readonly card_approved: boolean
  readonly copy_approved: boolean
  readonly pitch_saved: boolean
  readonly approved_posts: number
}

export function toContentFlags(f: ContentFlagsWire): ContentProductFlags {
  return { cardApproved: f.card_approved, copyApproved: f.copy_approved, pitchSaved: f.pitch_saved, approvedPosts: f.approved_posts }
}

export function isProductCardDone(f: ContentProductFlags): boolean {
  return f.cardApproved && f.copyApproved
}

/** Lý do bước còn khoá với sản phẩm đang làm; `null` = được làm. Không có sản phẩm → chỉ cần chọn từ Kho. */
export function contentLockedReason(step: ContentStep, f: ContentProductFlags | null): string | null {
  if (step === "PRODUCT_CARD" || step === "AUTO_PUBLISH" || f === null) return null
  if (!isProductCardDone(f)) return "Duyệt Thẻ sản phẩm và Bài giới thiệu ở Bước 1 trước"
  if (step === "CHANNEL_POSTS" && !f.pitchSaved) return "Chốt Thẻ chào sản phẩm ở Bước 2 trước"
  return null
}

function doneOf(step: ContentStep, f: ContentProductFlags): boolean {
  if (step === "PRODUCT_CARD") return isProductCardDone(f)
  if (step === "SALES_PITCH") return f.pitchSaved
  if (step === "CHANNEL_POSTS") return f.approvedPosts > 0
  return false
}

/** Trạng thái hiển thị của 4 ô bước theo đúng thứ tự `CONTENT_STEPS`. */
export function contentStepStatuses(f: ContentProductFlags | null): JourneyStepStatus[] {
  return CONTENT_STEPS.map((step) => {
    if (f === null) return step === "PRODUCT_CARD" ? "INPUT_REQUIRED" : "AVAILABLE"
    if (contentLockedReason(step, f)) return "LOCKED"
    if (doneOf(step, f)) return "COMPLETED"
    return step === "PRODUCT_CARD" ? "INPUT_REQUIRED" : "AVAILABLE"
  })
}

/** Bước nên mở khi vào: chưa có sản phẩm → Bước 1; có thì bước đầu tiên chưa xong (hết thì Bước 4). */
export function currentContentStep(f: ContentProductFlags | null): ContentStep {
  if (f === null || !isProductCardDone(f)) return "PRODUCT_CARD"
  if (!f.pitchSaved) return "SALES_PITCH"
  if (f.approvedPosts === 0) return "CHANNEL_POSTS"
  return "AUTO_PUBLISH"
}
