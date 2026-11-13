/**
 * Sidebar Tầng 2: SaaS Ngành (Industry Growth & Network Platform)
 * Nền tảng phát triển ngành hàng và mạng lưới phân phối affiliate xuyên cửa hàng.
 */

import type { NavEntry, NavGroup, NavView } from "./nav-types"
import { PRIVATE_COLLECTION, PUBLIC_COLLECTION } from "@/modules/toolkit/domain/collection-names"

export const INDUSTRY_NAV_ENTRIES: readonly NavEntry[] = [
  // 1. TRUNG TÂM ĐIỀU HÀNH
  {
    href: "/",
    label: "Tổng quan",
    group: "trung-tam-dieu-hanh",
    iconKey: "LayoutDashboard",
    navKey: "industry-overview",
    mobileLabel: "Tổng quan",
  },

  // 2. CÔNG CỤ BÁN HÀNG
  {
    href: "/cong-cu",
    label: "Công cụ",
    group: "cong-cu-ban-hang",
    iconKey: "LayoutGrid",
    navKey: "industry-toolkit",
    mobileLabel: "Công cụ",
  },
  {
    href: "/creative-studio",
    label: "Chế tác tự động",
    group: "cong-cu-ban-hang",
    iconKey: "Sparkles",
    navKey: "industry-auto-campaign",
    capability: "I1",
    mobileLabel: "Tự động A-Z",
  },
  {
    href: "/landing-page",
    label: "Landing page",
    group: "cong-cu-ban-hang",
    iconKey: "Globe",
    navKey: "industry-landing",
    mobileLabel: "Landing",
  },
  {
    href: "/catalog",
    label: PUBLIC_COLLECTION.name,
    hint: PUBLIC_COLLECTION.hint,
    group: "cong-cu-ban-hang",
    iconKey: "QrCode",
    navKey: "industry-catalog",
    capability: "J1",
    mobileLabel: PUBLIC_COLLECTION.mobileLabel,
  },
  {
    href: "/the-chao",
    label: PRIVATE_COLLECTION.name,
    hint: PRIVATE_COLLECTION.hint,
    group: "cong-cu-ban-hang",
    iconKey: "CreditCard",
    navKey: "industry-greeting-card",
    capability: "R1",
    mobileLabel: PRIVATE_COLLECTION.mobileLabel,
  },
  {
    href: "/market-intelligence",
    label: "Xu hướng ngành",
    group: "cong-cu-ban-hang",
    iconKey: "TrendingUp",
    navKey: "industry-market",
    capability: "V2",
    mobileLabel: "Xu hướng",
  },
  {
    href: "/kho-templates",
    label: "Thư viện mẫu",
    group: "cong-cu-ban-hang",
    iconKey: "LayoutTemplate",
    navKey: "industry-templates",
    mobileLabel: "Template",
  },

  // 3. SẢN PHẨM & DANH MỤC NGHÀNH
  {
    href: "/san-pham",
    label: "Sản phẩm mẫu",
    group: "san-pham-nganh",
    iconKey: "Package",
    navKey: "industry-products",
    capability: "L1",
    mobileLabel: "Sản phẩm",
  },
  {
    href: "/gia",
    label: "Giá & chiết khấu",
    group: "san-pham-nganh",
    iconKey: "WalletCards",
    navKey: "industry-pricing",
    capability: "L6",
    mobileLabel: "Giá ngành",
  },

  // 4. MẠNG LƯỚI & ĐIỀU PHỐI
  {
    href: "/dieu-phoi/doi-tac",
    label: "Đối tác",
    group: "mang-luoi-dieu-phoi",
    iconKey: "Building2",
    navKey: "industry-partners",
    mobileLabel: "Đối tác",
  },
  {
    href: "/don-hang",
    label: "Đơn Affiliate",
    group: "mang-luoi-dieu-phoi",
    iconKey: "ShoppingBag",
    navKey: "industry-orders",
    capability: "R1",
    mobileLabel: "Đơn hàng",
  },
  {
    href: "/dieu-phoi",
    label: "Điều phối",
    group: "mang-luoi-dieu-phoi",
    iconKey: "Radio",
    navKey: "industry-dispatch",
    capability: "C23",
    mobileLabel: "Điều phối",
  },
  {
    href: "/duyet",
    label: "Kiểm soát chất lượng",
    group: "mang-luoi-dieu-phoi",
    iconKey: "CheckCircle2",
    navKey: "industry-approvals",
    capability: "H3",
    mobileLabel: "Duyệt QC",
  },

  // 5. HIỆU QUẢ THƯƠNG MẠI
  {
    href: "/so-lieu",
    label: "Hiệu suất kênh bán",
    group: "hieu-qua-thuong-mai",
    iconKey: "BarChart3",
    navKey: "industry-channel-performance",
    capability: "U3",
    mobileLabel: "Hiệu suất",
  },

  // 6. THIẾT LẬP
  {
    href: "/cai-dat?tab=INFO",
    label: "Hồ sơ ngành",
    group: "thiet-lap-nganh",
    iconKey: "Building2",
    navKey: "industry-standard-profile",
    capability: "F1",
    mobileLabel: "Hồ sơ",
  },
  {
    href: "/cai-dat",
    label: "Cấu hình ngành",
    group: "thiet-lap-nganh",
    iconKey: "Settings2",
    navKey: "industry-settings",
    capability: "F1",
    mobileLabel: "Cài đặt",
  },
  {
    href: "/cai-dat/thong-bao",
    label: "Ma trận thông báo",
    group: "thiet-lap-nganh",
    iconKey: "Bell",
    navKey: "industry-notifications",
    capability: "F1",
    mobileLabel: "Thông báo",
  },
  {
    href: "/cai-dat/ma-tran-uudai",
    label: "Ma trận ưu đãi",
    group: "thiet-lap-nganh",
    iconKey: "Tag",
    navKey: "industry-matrix-promotions",
    capability: "F1",
    mobileLabel: "Ưu đãi",
  },
  {
    href: "/cai-dat/ma-tran-camket",
    label: "Ma trận cam kết",
    group: "thiet-lap-nganh",
    iconKey: "ShieldCheck",
    navKey: "industry-matrix-commitments",
    capability: "F1",
    mobileLabel: "Cam kết",
  },
  {
    href: "/cai-dat/ma-tran-chinhsach",
    label: "Ma trận chính sách",
    group: "thiet-lap-nganh",
    iconKey: "FileText",
    navKey: "industry-matrix-policies",
    capability: "F1",
    mobileLabel: "Chính sách",
  },
  {
    href: "/cai-dat/ma-tran-thanhtoan-datco",
    label: "Ma trận thanh toán",
    group: "thiet-lap-nganh",
    iconKey: "CreditCard",
    navKey: "industry-matrix-payments",
    capability: "F1",
    mobileLabel: "Thanh toán",
  },
  {
    href: "/cai-dat/ma-tran-phigiacong",
    label: "Ma trận phí gia công",
    group: "thiet-lap-nganh",
    iconKey: "Wrench",
    navKey: "industry-matrix-craft-fees",
    capability: "F1",
    mobileLabel: "Phí thợ",
  },
] as const

export const INDUSTRY_GROUPS_CONFIG = [
  { key: "trung-tam-dieu-hanh", label: "Trung tâm Điều hành" },
  { key: "cong-cu-ban-hang", label: "Công cụ Bán hàng" },
  { key: "san-pham-nganh", label: "Sản phẩm ngành" },
  { key: "mang-luoi-dieu-phoi", label: "Mạng lưới & Điều phối" },
  { key: "hieu-qua-thuong-mai", label: "Hiệu quả Thương mại" },
  { key: "thiet-lap-nganh", label: "Thiết lập" },
] as const

export function buildIndustryNav(can: (code: string) => boolean): NavView {
  const groups: NavGroup[] = []

  for (const config of INDUSTRY_GROUPS_CONFIG) {
    const entries = INDUSTRY_NAV_ENTRIES.filter(
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
