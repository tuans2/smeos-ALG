/**
 * PHÁT_TRIỂN_SAU — nội dung cũ của một nhóm trên /cong-cu được thay bằng hành trình mới (PO 08/11/2026).
 *
 * Nhóm "Hồ sơ & Thương hiệu" giờ hiện giao diện ô 3 bước (Hồ sơ cửa hàng → Bộ nhận diện → Landing page,
 * dùng chung code với /ho-so). 16 loại ấn phẩm + công cụ cũ của nhóm KHÔNG xoá: dời vào khu "Phát triển sau"
 * chỉ hiện ở môi trường phát triển, không tính vào số liệu đầu trang. PO dự kiến có thể xoá hẳn sau này —
 * bật lại một nhóm: bỏ dòng tương ứng ở đây. Thuần — không import hạ tầng.
 */
import type { BusinessModuleKey } from "@/modules/marketing-center/domain/asset-type"

/** Hành trình thay thế nội dung của nhóm (component hiển thị chọn theo khoá này). */
export type ModuleJourney = "BRAND_KIT"

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
}

export function deferredContentOf(key: BusinessModuleKey): DeferredModuleContent | null {
  return DEFERRED_MODULE_CONTENT[key] ?? null
}
