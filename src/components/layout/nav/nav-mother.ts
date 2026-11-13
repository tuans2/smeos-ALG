/**
 * Sidebar Tầng 1: SaaS Mother (Platform Control Center · Quản trị nền tảng SaaS)
 * Quản trị toàn bộ 3 tầng dưới, hạ tầng đám mây, đa tenant, AI resources và bảo mật.
 */

import type { NavEntry, NavGroup, NavView } from "./nav-types"

export const MOTHER_NAV_ENTRIES: readonly NavEntry[] = [
  // 1. TỔNG QUAN
  {
    href: "/van-hanh",
    label: "Tổng quan",
    group: "tong-quan",
    iconKey: "LayoutDashboard",
    navKey: "platform-overview",
    mobileLabel: "Tổng quan",
  },
  {
    href: "/van-hanh/thu-vien-man-hinh",
    label: "Thư viện màn hình",
    group: "tong-quan",
    iconKey: "Monitor",
    navKey: "platform-screen-library",
    mobileLabel: "Màn hình",
  },
  {
    href: "/van-hanh/thu-vien-giao-dien",
    label: "Thư viện giao diện",
    group: "tong-quan",
    iconKey: "Layers",
    navKey: "platform-ui-catalog",
    mobileLabel: "UI Catalog",
  },

  // 2. TỔ CHỨC & DỊCH VỤ
  {
    href: "/van-hanh/marketplace",
    label: "Chợ đối tác",
    group: "to-chuc-dich-vu",
    iconKey: "Store",
    navKey: "platform-marketplace",
    mobileLabel: "Chợ Đối tác",
  },
  {
    href: "/van-hanh/to-chuc",
    label: "Tổ chức",
    group: "to-chuc-dich-vu",
    iconKey: "Building2",
    navKey: "platform-organizations",
    mobileLabel: "Tổ chức",
  },
  {
    href: "/van-hanh/dang-ky",
    label: "Đăng ký",
    group: "to-chuc-dich-vu",
    iconKey: "UserPlus",
    navKey: "platform-registrations",
    mobileLabel: "Đăng ký",
  },
  {
    href: "/van-hanh/phe-duyet",
    label: "Gói dịch vụ",
    group: "to-chuc-dich-vu",
    iconKey: "CreditCard",
    navKey: "platform-subscriptions",
    mobileLabel: "Gói cước",
  },
  {
    href: "/van-hanh/nganh",
    label: "Ngành hàng",
    group: "to-chuc-dich-vu",
    iconKey: "Layers",
    navKey: "platform-industry-matrix",
    mobileLabel: "Ngành hàng",
  },
  {
    href: "/van-hanh/nganh?tab=tools",
    label: "Ma trận công cụ",
    group: "to-chuc-dich-vu",
    iconKey: "LayoutGrid",
    navKey: "platform-toolkit-matrix",
    mobileLabel: "Công cụ",
  },

  // 3. GIÁM SÁT SẢN PHẨM & KHO (toàn nền tảng)
  {
    href: "/van-hanh/truong-du-lieu",
    label: "Trường dữ liệu",
    group: "san-pham-kho-platform",
    iconKey: "Layers",
    navKey: "platform-taxonomy",
    mobileLabel: "Schema",
  },


  // 3. HẠ TẦNG & TÀI NGUYÊN
  {
    href: "/cai-dat-ai",
    label: "Cấu hình AI",
    group: "ha-tang-tai-nguyen",
    iconKey: "Cpu",
    navKey: "platform-ai-providers",
    mobileLabel: "AI Models",
  },
  {
    href: "/van-hanh/muc-dung",
    label: "Mức dùng",
    group: "ha-tang-tai-nguyen",
    iconKey: "WalletCards",
    navKey: "platform-usage",
    mobileLabel: "Mức dùng",
  },
  {
    href: "/van-hanh/du-lieu",
    label: "Dữ liệu & lưu trữ",
    group: "ha-tang-tai-nguyen",
    iconKey: "Database",
    navKey: "platform-org-data",
    mobileLabel: "Dữ liệu",
  },

  // 4. ĐỘ TIN CẬY & BẢO MẬT
  {
    href: "/van-hanh/suc-khoe",
    label: "Sức khỏe",
    group: "do-tin-cay-bao-mat",
    iconKey: "Activity",
    navKey: "platform-health",
    mobileLabel: "Sức khỏe",
  },
  {
    href: "/van-hanh/nhat-ky",
    label: "Nhật ký kiểm toán",
    group: "do-tin-cay-bao-mat",
    iconKey: "ShieldCheck",
    navKey: "platform-audit",
    mobileLabel: "Kiểm toán",
  },

  // 5. THIẾT LẬP
  {
    href: "/van-hanh/cau-hinh",
    label: "Cấu hình",
    group: "thiet-lap-platform",
    iconKey: "SlidersHorizontal",
    navKey: "platform-config",
    mobileLabel: "Cấu hình",
  },

  // 6. MA TRẬN QUẢN TRỊ 4 TẦNG
  {
    href: "/van-hanh/thong-bao",
    label: "Ma trận thông báo",
    group: "ma-tran-governance",
    iconKey: "Bell",
    navKey: "platform-notifications",
    mobileLabel: "Thông báo",
  },
  {
    href: "/van-hanh/ma-tran-uudai",
    label: "Ma trận ưu đãi",
    group: "ma-tran-governance",
    iconKey: "Tag",
    navKey: "platform-matrix-promotions",
    mobileLabel: "Ưu đãi",
  },
  {
    href: "/van-hanh/ma-tran-camket",
    label: "Ma trận cam kết",
    group: "ma-tran-governance",
    iconKey: "ShieldCheck",
    navKey: "platform-matrix-commitments",
    mobileLabel: "Cam kết",
  },
  {
    href: "/van-hanh/ma-tran-chinhsach",
    label: "Ma trận chính sách",
    group: "ma-tran-governance",
    iconKey: "FileText",
    navKey: "platform-matrix-policies",
    mobileLabel: "Chính sách",
  },
  {
    href: "/van-hanh/ma-tran-thanhtoan-datco",
    label: "Ma trận thanh toán",
    group: "ma-tran-governance",
    iconKey: "CreditCard",
    navKey: "platform-matrix-payments",
    mobileLabel: "Thanh toán",
  },
  {
    href: "/van-hanh/ma-tran-phigiacong",
    label: "Ma trận phí gia công",
    group: "ma-tran-governance",
    iconKey: "Wrench",
    navKey: "platform-matrix-craft-fees",
    mobileLabel: "Phí thợ",
  },
] as const

export const MOTHER_GROUPS_CONFIG = [
  { key: "tong-quan", label: "TỔNG QUAN" },
  { key: "to-chuc-dich-vu", label: "TỔ CHỨC & DỊCH VỤ" },
  { key: "san-pham-kho-platform", label: "SẢN PHẨM & KHO" },
  { key: "ha-tang-tai-nguyen", label: "HẠ TẦNG & TÀI NGUYÊN" },
  { key: "do-tin-cay-bao-mat", label: "Bảo mật" },
  { key: "ma-tran-governance", label: "Ma trận 4 tầng" },
  { key: "thiet-lap-platform", label: "THIẾT LẬP" },
] as const


export function buildMotherNav(can: (code: string) => boolean): NavView {
  const groups: NavGroup[] = []

  for (const config of MOTHER_GROUPS_CONFIG) {
    const entries = MOTHER_NAV_ENTRIES.filter(
      (entry) =>
        entry.group === config.key &&
        (!entry.capability || can(entry.capability))
    )
    if (entries.length > 0) {
      groups.push({
        key: config.key,
        label: config.label,
        entries: [...entries],
      })
    }
  }

  return { groups }
}
