/**
 * Kiểu dữ liệu điều hướng hệ thống (Navigation Types SSOT)
 * Chuẩn hóa theo đặc tả SMEOS_4_TIER_ARCHITECTURE_AND_NAVIGATION_SSOT.md
 */

import type { RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"

export type NavGroupKey =
  | "viec-chinh"
  | "ban-hang"
  | "san-pham"
  | "noi-dung"
  | "van-hanh"
  | "thiet-lap"
  | "to-chuc"
  | "cau-hinh"
  | "giam-sat"
  | "he-sinh-thai"
  | "chuan-hoa"
  | "thi-truong"
  // Tầng 1: SaaS Mother (Platform Console)
  | "tong-quan"
  | "to-chuc-dich-vu"
  | "ha-tang-tai-nguyen"
  | "do-tin-cay-bao-mat"
  | "thiet-lap-platform"
  | "tong-quan-nen-tang"
  | "quan-tri-to-chuc"
  | "goi-cuoc-doanh-thu"
  | "ha-tang-ai"
  | "bao-mat-kiem-toan"
  // Tầng 2: SaaS Ngành (Industry Growth & Network Platform)
  | "trung-tam-dieu-hanh"
  | "cong-cu-ban-hang"
  | "chuan-hoa-nganh"
  | "mang-luoi-dieu-phoi"
  | "hieu-qua-thuong-mai"
  | "thiet-lap-nganh"
  | "tong-quan-nganh"
  | "cong-cu-affiliate"
  | "tu-dong-phan-bo"
  | "doi-soat-hoa-hong"
  // Tầng 3: ChainOS (Không gian điều hành chuỗi)
  | "dieu-hanh-chuoi"
  | "cong-cu-chuoi"
  | "kinh-doanh-chuoi"
  | "bao-cao-tai-chinh-chuoi"
  | "thiet-lap-chuoi"
  | "chi-huy-chuoi"
  | "ban-hang-chuoi"
  | "dieu-phoi-gia-cong"
  | "mang-luoi-chi-nhanh"
  | "bo-suu-tap-chuoi"
  | "doi-soat-chuoi"
  // Tầng 1: SaaS Mother — Sản phẩm & Kho
  | "san-pham-kho-platform"
  // Tầng 2: SaaS Ngành — Sản phẩm & Kho
  | "san-pham-nganh"
  // Tầng 3: ChainOS — Sản phẩm & Kho
  | "san-pham-kho-chuoi"
  // Tầng 4: StoreOS (Không gian làm việc cửa hàng)
  | "cong-cu"
  | "quan-tri"
  | "cong-cu-tiem"
  | "quan-tri-tiem"
  | "viec-chinh-tiem"
  | "ban-hang-tiem"
  | "san-xuat-tiem"
  | "san-pham-kho-tiem"
  | "marketing-tiem"
  | "so-quy-cai-dat"
  | "kho"

export interface NavEntry {
  href: string
  label: string
  group: string
  iconKey: string
  navKey: string
  capability?: string
  status?: "READY" | "COMING_SOON"
  mobileLabel?: string
  /** Mô tả mục đích — hiện khi rê chuột lên mục */
  hint?: string
}

export interface NavGroup {
  key: string
  label: string
  entries: NavEntry[]
}

export interface NavView {
  groups: NavGroup[]
}

export const HOME_ENTRY: NavEntry = {
  href: "/",
  label: "Trang chủ",
  group: "viec-chinh",
  iconKey: "Home",
  navKey: "home",
  mobileLabel: "Trang chủ",
}

/**
 * Danh sách khóa nhóm Công cụ (Toolkit Groups) trên toàn bộ các tầng (SSOT).
 * Bất kỳ nhóm nào thuộc danh mục này sẽ tự động được gắn cấu trúc:
 * Thư viện cố định (/cong-cu) + Danh sách Shortcuts người dùng tự ghim + Mini picker.
 */
export const TOOLKIT_GROUP_KEYS = [
  "cong-cu",           // Tầng 4: StoreOS
  "cong-cu-chuoi",     // Tầng 3: ChainOS
  "cong-cu-ban-hang",  // Tầng 2: SaaS Ngành
] as const

export type ToolkitGroupKey = (typeof TOOLKIT_GROUP_KEYS)[number]

export function isToolkitGroupKey(key: string): key is ToolkitGroupKey {
  return (TOOLKIT_GROUP_KEYS as readonly string[]).includes(key)
}

