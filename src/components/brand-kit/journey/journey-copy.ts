/**
 * Nội dung chữ dùng chung cho HAI giao diện của mục Thương hiệu (/ho-so dạng tab, /cong-cu dạng ô) — một chỗ duy nhất,
 * để hai nơi luôn nói cùng một câu. Thuần — không React.
 */
import type { ConfirmOptions } from "@/components/ui/confirm-dialog"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import type { BrandStyleKey } from "@/modules/brand-kit/domain/brand-styles"
import { evaluateStoreProfile } from "@/modules/profiles/domain/store-profile-completeness"
import type { TenantProfileState } from "@/lib/hooks/use-tenant-profile"

export const LOCK_HINT: Record<BrandStep, string> = {
  PROFILE: "",
  IDENTITY: "Hoàn thành Hồ sơ cửa hàng để mở Bộ nhận diện thương hiệu.",
  LANDING: "Chọn một Bộ nhận diện thương hiệu để mở Landing page.",
}

export const LOCK_SHORT: Record<BrandStep, string> = {
  PROFILE: "",
  IDENTITY: "Mở khi hồ sơ đủ",
  LANDING: "Mở khi đã chọn bộ nhận diện",
}

/** Bố cục trang khách theo phong cách (mô tả ngắn trên thẻ phương án Landing). */
export const LANDING_LAYOUT_HINT: Record<BrandStyleKey, string> = {
  LUXURY: "Ảnh lớn, nhiều khoảng trắng, chữ có chân",
  YOUTHFUL: "Lưới khối nhiều màu, nút bấm nổi bật",
  RUSTIC: "Tông ấm, kể chuyện tay nghề",
}

export const CONFIRM_CHANGE_IDENTITY: ConfirmOptions = {
  title: "Đổi bộ nhận diện chính thức?",
  consequence: "Màu, phông chữ, khẩu hiệu và logo của cửa hàng sẽ đổi theo phương án mới ở mọi nơi: danh thiếp, trang chia sẻ và Landing page. Bạn có thể chọn lại phương án cũ bất cứ lúc nào.",
  confirmLabel: "Đổi bộ nhận diện",
}

export function confirmPublishLanding(alreadyPublished: boolean): ConfirmOptions {
  return alreadyPublished
    ? { title: "Đổi giao diện trang chính thức?", consequence: "Trang giữ nguyên đường dẫn đã chia sẻ, chỉ đổi giao diện và nội dung theo phương án mới.", confirmLabel: "Đổi giao diện" }
    : {
      title: "Xuất bản Landing page chính thức?",
      consequence: "Trang sẽ có đường dẫn công khai — ai có link hoặc mã QR đều xem được tên cửa hàng, thông tin liên hệ, sản phẩm chủ đạo và giá. Bạn có thể đổi phương án sau.",
      confirmLabel: "Xuất bản",
    }
}

/** Điều kiện tạo link trang hồ sơ chia sẻ (thẻ `StoreShareLinkCard`). */
export function shareReadiness(profile: TenantProfileState): { readyToShare: boolean; missingEssentials: string[] } {
  const r = evaluateStoreProfile({ business: profile.business, brand: profile.brand })
  return { readyToShare: r.readyToShare, missingEssentials: r.missing.filter((m) => m.essential).map((m) => m.label) }
}
