/**
 * PHÁT_TRIỂN_SAU — nội dung cũ của một nhóm trên /cong-cu được thay bằng hành trình mới (PO 08/11/2026).
 *
 * Nhóm "Tạo nội dung" (PO 08/11/2026) cũng vậy: ô 4 bước Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh → Đăng tự động.
 * Nhóm "Quảng bá sản phẩm" (PO 09/11/2026): 3 ô chức năng độc lập Landing page · Bộ sưu tập chung · Bộ sưu tập riêng;
 * 11 công cụ + ấn phẩm cũ của nhóm dời vào "Phát triển sau" (menu bên trái và các trang cũ giữ nguyên).
 * Nhóm "Hồ sơ & Thương hiệu" giờ hiện giao diện ô 3 bước (Hồ sơ cửa hàng → Bộ nhận diện → Landing page,
 * dùng chung code với /ho-so). 16 loại ấn phẩm + công cụ cũ của nhóm KHÔNG xoá: dời vào khu "Phát triển sau"
 * chỉ hiện ở môi trường phát triển, không tính vào số liệu đầu trang. PO dự kiến có thể xoá hẳn sau này —
 * bật lại một nhóm: bỏ dòng tương ứng ở đây. Thuần — không import hạ tầng.
 */
import type { BusinessModuleKey } from "@/modules/marketing-center/domain/asset-type"

/** Hành trình thay thế nội dung của nhóm (component hiển thị chọn theo khoá này). */
export type ModuleJourney = "BRAND_KIT" | "CONTENT_STUDIO" | "PROMOTION_HUB"

export interface DeferredModuleContent {
  readonly journey: ModuleJourney
  /** Nhãn gắn cho nội dung cũ */
  readonly tag: "PHÁT_TRIỂN_SAU"
  readonly decidedAt: string
  readonly reason: string
}

export const DEFERRED_MODULE_CONTENT: Readonly<Partial<Record<BusinessModuleKey, DeferredModuleContent>>> = {
  brand: {
    journey: "BRAND_KIT",
    tag: "PHÁT_TRIỂN_SAU",
    decidedAt: "08/11/2026",
    reason: "Thay bằng hành trình 3 bước Hồ sơ cửa hàng → Bộ nhận diện → Landing page; nội dung cũ có thể xoá sau",
  },
  content: {
    journey: "CONTENT_STUDIO",
    tag: "PHÁT_TRIỂN_SAU",
    decidedAt: "08/11/2026",
    reason: "Thay bằng hành trình 4 bước Thẻ sản phẩm → Thẻ chào sản phẩm → Bài đăng đa kênh → Đăng tự động; nội dung cũ có thể xoá sau",
  },
  promotion: {
    journey: "PROMOTION_HUB",
    tag: "PHÁT_TRIỂN_SAU",
    decidedAt: "09/11/2026",
    reason: "Thay bằng 3 ô chức năng độc lập Landing page · Bộ sưu tập chung · Bộ sưu tập riêng; công cụ và ấn phẩm cũ có thể xoá sau",
  },
}

export function deferredContentOf(key: BusinessModuleKey): DeferredModuleContent | null {
  return DEFERRED_MODULE_CONTENT[key] ?? null
}

/**
 * Lối vào khác của chức năng thương hiệu, ẩn khỏi người dùng (PHÁT_TRIỂN_SAU, PO 08/11/2026) để chức năng chỉ còn
 * ở /ho-so và nhóm "Hồ sơ & Thương hiệu" trên /cong-cu. Code giữ nguyên; môi trường phát triển vẫn thấy.
 * Danh thiếp vẫn mở từ ô Danh thiếp trong Bộ nhận diện.
 */
export const DEFERRED_SURFACES = {
  SETTINGS_BRANDING_TAB: "Cài đặt → tab Thương hiệu (màu, phông chữ, khẩu hiệu, logo)",
  BRAND_LIBRARY_SHORTCUT: "Lối tắt công cụ tới Thư viện thương hiệu (/ho-so/thu-vien-thuong-hieu)",
  BUSINESS_CARD_SHORTCUT: "Lối tắt công cụ tới trang Danh thiếp (/ho-so/danh-thiep)",
  LANDING_OFFICIAL_BANNER: "Thẻ \"Trang chính thức của cửa hàng\" trên /landing-page",
} as const

/** Đường dẫn công cụ không hiện trong danh sách lối tắt ghim (ngoài môi trường phát triển). */
export const DEFERRED_TOOL_HREFS: readonly string[] = ["/ho-so/thu-vien-thuong-hieu", "/ho-so/danh-thiep"]
