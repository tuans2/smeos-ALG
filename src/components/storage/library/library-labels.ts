import type { LibraryType } from "@/modules/storage/domain/library"

/** Nhãn tab thư viện (Screen Contract `kho-du-lieu.md` §4) — không hiện mã kỹ thuật lên màn hình. */
export const LIBRARY_TAB_LABEL: Readonly<Record<LibraryType, string>> = {
  original: "Ảnh gốc",
  ai_image: "Ảnh AI",
  video: "Video",
  audio: "Âm thanh",
  content: "Nội dung",
  catalog: "Catalog",
  greeting_catalog: "Bộ sưu tập riêng",
  landing: "Landing page",
}

export const LIBRARY_CREATE_LABEL: Readonly<Record<LibraryType, string>> = {
  original: "Tải ảnh mới",
  ai_image: "Tạo ảnh mới",
  video: "Tạo video mới",
  audio: "Thêm âm thanh",
  content: "Tạo nội dung mới",
  catalog: "Tạo catalog",
  greeting_catalog: "Tạo bộ sưu tập riêng",
  landing: "Tạo landing page",
}

const SUBTYPE_LABEL: Readonly<Record<string, string>> = {
  ORIGINAL: "Ảnh gốc",
  ENHANCED: "Ảnh đã làm đẹp",
  MASTER: "Ảnh chính sản phẩm",
  MARKETING: "Ảnh quảng cáo",
  CATALOG: "Ảnh catalog",
  LANDING: "Ảnh trang giới thiệu",
  SOCIAL: "Ảnh mạng xã hội",
  RATIO: "Ảnh đổi khung",
  MUSIC: "Nhạc nền",
  VOICE: "Giọng đọc",
}

const STATUS_LABEL: Readonly<Record<string, string>> = {
  READY: "Sẵn sàng",
  PROCESSING: "Đang xử lý",
  FAILED: "Lỗi",
  DRAFT: "Bản nháp",
  APPROVED: "Đã duyệt",
  PUBLISHED: "Đã đăng",
  ACTIVE: "Đang chia sẻ",
  REVOKED: "Đã thu hồi",
  STANDARD: "Bộ sưu tập",
  CLIENT: "Theo khách",
  RENDER_COMPLETED: "Đã dựng xong",
  RENDERING: "Đang dựng",
  PENDING: "Đang chờ",
}

export function subtypeLabel(subtype: string | null): string | null {
  return subtype ? (SUBTYPE_LABEL[subtype] ?? null) : null
}

/** Trạng thái lạ không có nhãn thì không hiện (thay vì hiện mã). */
export function statusLabel(status: string | null): string | null {
  return status ? (STATUS_LABEL[status] ?? null) : null
}
