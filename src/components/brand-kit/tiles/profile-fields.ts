/**
 * Danh mục ô của Bước 1 trên /cong-cu: 8 mục cần có (khớp `evaluateProfileStep`) + 4 mục tuỳ chọn.
 * `target` cho biết ô lưu vào hồ sơ kinh doanh hay hồ sơ thương hiệu.
 */
import { Store } from "@/components/ui/icon-set/store"
import { Phone } from "@/components/ui/icon-set/phone"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Users } from "@/components/ui/icon-set/users"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Video } from "@/components/ui/icon-set/video"
import { Package } from "@/components/ui/icon-set/package"
import { BadgeCheck } from "@/components/ui/icon-set/badge-check"
import { Clock } from "@/components/ui/icon-set/clock"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Mail } from "@/components/ui/icon-set/mail"

export type ProfileFieldKey =
  | "display_name" | "phone" | "address" | "description" | "target_customers"
  | "storefront_photos" | "intro_video" | "featured_products"
  | "logo" | "operating_hours" | "social_links" | "email"

export interface ProfileFieldMeta {
  readonly label: string
  readonly hint: string
  readonly placeholder?: string
  readonly icon: typeof Store
  readonly target: "BUSINESS" | "BRAND"
}

export const REQUIRED_FIELDS: readonly ProfileFieldKey[] = [
  "display_name", "phone", "address", "description", "target_customers", "storefront_photos", "intro_video", "featured_products",
]
export const OPTIONAL_FIELDS: readonly ProfileFieldKey[] = ["logo", "operating_hours", "social_links", "email"]

export const PROFILE_FIELDS: Readonly<Record<ProfileFieldKey, ProfileFieldMeta>> = {
  display_name: { label: "Tên cửa hàng", hint: "Dùng cho logo, danh thiếp và trang landing", placeholder: "Ví dụ: Cửa hàng Mộc Lan", icon: Store, target: "BUSINESS" },
  phone: { label: "Điện thoại", hint: "Khách gọi hoặc nhắn Zalo từ danh thiếp và trang landing", placeholder: "0901 234 567", icon: Phone, target: "BUSINESS" },
  address: { label: "Địa chỉ", hint: "Khách tìm đường đến cửa hàng", placeholder: "Số nhà, đường, phường, quận", icon: MapPin, target: "BUSINESS" },
  description: { label: "Giới thiệu ngắn", hint: "Hệ thống dựa vào đây để viết khẩu hiệu và câu chuyện cửa hàng", placeholder: "Cửa hàng bán gì, khác biệt ở đâu…", icon: FileText, target: "BUSINESS" },
  target_customers: { label: "Khách mục tiêu", hint: "Cách nhau bằng dấu phẩy — giúp chọn phong cách phù hợp", placeholder: "Văn phòng tặng sếp, Cặp đôi, Gia đình", icon: Users, target: "BUSINESS" },
  storefront_photos: { label: "Ảnh cửa hàng", hint: "Ít nhất 1 ảnh không gian cửa hàng cho trang landing", icon: ImageIcon, target: "BRAND" },
  intro_video: { label: "Video giới thiệu", hint: "Video ngắn về cửa hàng, hiện trên trang landing", icon: Video, target: "BRAND" },
  featured_products: { label: "Sản phẩm chủ đạo", hint: "Chọn 1–6 sản phẩm tiêu biểu từ kho sản phẩm", icon: Package, target: "BRAND" },
  logo: { label: "Logo", hint: "Không bắt buộc — chưa có thì bước sau hệ thống dựng logo cho bạn", icon: BadgeCheck, target: "BRAND" },
  operating_hours: { label: "Giờ mở cửa", hint: "Hiện trên trang chính thức và trang chia sẻ", icon: Clock, target: "BUSINESS" },
  social_links: { label: "Mạng xã hội", hint: "Khách theo dõi trang của cửa hàng", icon: Share2, target: "BUSINESS" },
  email: { label: "Thư điện tử", hint: "Kênh liên hệ cho khách doanh nghiệp", placeholder: "lienhe@cuahang.vn", icon: Mail, target: "BUSINESS" },
}
