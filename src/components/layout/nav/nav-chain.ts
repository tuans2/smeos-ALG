/**
 * Sidebar Tầng 3: ChainOS (Không gian điều hành chuỗi)
 * Tư duy: Điều hành chuỗi — Công cụ — Quản lý mạng lưới — Quản trị kết quả.
 */

import type { RoleUxDefinition } from "@/modules/organization/domain/role-ux-catalog"
import type { NavEntry, NavGroup, NavView } from "./nav-types"
import { PRIVATE_COLLECTION, PUBLIC_COLLECTION } from "@/modules/toolkit/domain/collection-names"

export const CHAIN_NAV_ENTRIES: readonly NavEntry[] = [
  // 01 · ĐIỀU HÀNH
  {
    href: "/",
    label: "Tổng quan",
    group: "dieu-hanh-chuoi",
    iconKey: "LayoutDashboard",
    navKey: "chain-command",
    mobileLabel: "Chỉ huy",
  },
  {
    href: "/don-hang",
    label: "Đơn hàng",
    group: "dieu-hanh-chuoi",
    iconKey: "ShoppingBag",
    navKey: "chain-orders",
    capability: "R1",
    mobileLabel: "Đơn hàng",
  },
  {
    href: "/dieu-phoi",
    label: "Tháp điều phối",
    group: "dieu-hanh-chuoi",
    iconKey: "Radio",
    navKey: "chain-coordinator",
    capability: "C23",
    mobileLabel: "Điều phối",
  },
  {
    href: "/duyet",
    label: "Duyệt chất lượng",
    group: "dieu-hanh-chuoi",
    iconKey: "CheckCircle2",
    navKey: "chain-qc",
    capability: "H3",
    mobileLabel: "Duyệt QC",
  },

  // 02 · CÔNG CỤ
  {
    href: "/cong-cu",
    label: "Công cụ",
    group: "cong-cu-chuoi",
    iconKey: "LayoutGrid",
    navKey: "chain-toolkit",
    mobileLabel: "Công cụ",
  },
  {
    href: "/creative-studio",
    label: "Chế tác tự động",
    group: "cong-cu-chuoi",
    iconKey: "Sparkles",
    navKey: "chain-auto-campaign",
    capability: "I1",
    mobileLabel: "Tự động A-Z",
  },
  {
    href: "/catalog",
    label: PUBLIC_COLLECTION.name,
    hint: PUBLIC_COLLECTION.hint,
    group: "cong-cu-chuoi",
    iconKey: "Globe",
    navKey: "chain-catalog",
    capability: "J1",
    mobileLabel: PUBLIC_COLLECTION.mobileLabel,
  },
  {
    href: "/the-chao",
    label: PRIVATE_COLLECTION.name,
    hint: PRIVATE_COLLECTION.hint,
    group: "cong-cu-chuoi",
    iconKey: "CreditCard",
    navKey: "chain-greeting-card",
    capability: "R1",
    mobileLabel: PRIVATE_COLLECTION.mobileLabel,
  },
  {
    href: "/market-intelligence",
    label: "Xu hướng thị trường",
    group: "cong-cu-chuoi",
    iconKey: "TrendingUp",
    navKey: "chain-market",
    capability: "I1",
    mobileLabel: "Xu hướng",
  },
  {
    href: "/video",
    label: "Ảnh & video",
    group: "cong-cu-chuoi",
    iconKey: "Video",
    navKey: "chain-video",
    capability: "I1",
    mobileLabel: "Video",
  },
  {
    href: "/kho-templates",
    label: "Mẫu ấn phẩm",
    group: "cong-cu-chuoi",
    iconKey: "LayoutTemplate",
    navKey: "chain-templates",
    mobileLabel: "Kho mẫu",
  },
  {
    href: "/san-pham",
    label: "Bộ sưu tập & giá",
    group: "san-pham-kho-chuoi",
    iconKey: "Tag",
    navKey: "chain-collections",
    capability: "L1",
    mobileLabel: "Sưu tập",
  },

  // 03 · KINH DOANH & KHÁCH HÀNG
  {
    href: "/khach-hang",
    label: "Khách hàng",
    group: "kinh-doanh-chuoi",
    iconKey: "Users",
    navKey: "chain-customers",
    capability: "Q1",
    mobileLabel: "Khách hàng",
  },
  {
    href: "/hoi-thoai",
    label: "Hội thoại",
    group: "kinh-doanh-chuoi",
    iconKey: "Bot",
    navKey: "chain-chat",
    capability: "T1",
    mobileLabel: "Hội thoại",
  },
  {
    href: "/dieu-phoi/doi-tac",
    label: "Chi nhánh & xưởng",
    group: "kinh-doanh-chuoi",
    iconKey: "Store",
    navKey: "chain-branches",
    mobileLabel: "Chi nhánh",
  },
  {
    href: "/san-pham/kha-dung",
    label: "Khả dụng & năng lực",
    group: "san-pham-kho-chuoi",
    iconKey: "CalendarCheck",
    navKey: "chain-availability",
    capability: "L1",
    mobileLabel: "Khả dụng",
  },

  // SẢN PHẨM & KHO CHUỘI (tiếp theo)
  {
    href: "/gia",
    label: "Giá & chiết khấu",
    group: "san-pham-kho-chuoi",
    iconKey: "WalletCards",
    navKey: "chain-pricing",
    capability: "L6",
    mobileLabel: "Giá chuỗi",
  },
  {
    href: "/kho-du-lieu",
    label: "Kho nguyên liệu",
    group: "san-pham-kho-chuoi",
    iconKey: "Folder",
    navKey: "chain-storage",
    capability: "G1",
    mobileLabel: "Kho",
  },

  // 04 · BÁO CÁO & TÀI CHÍNH
  {
    href: "/so-lieu",
    label: "Báo cáo hiệu suất",
    group: "bao-cao-tai-chinh-chuoi",
    iconKey: "BarChart3",
    navKey: "chain-stats",
    capability: "U3",
    mobileLabel: "Hiệu suất",
  },
  {
    href: "/bao-cao",
    label: "Báo cáo theo kỳ",
    group: "bao-cao-tai-chinh-chuoi",
    iconKey: "BarChart3",
    navKey: "chain-reports",
    capability: "R20",
    mobileLabel: "Báo cáo",
  },
  {
    href: "/du-lieu",
    label: "Đối soát & công nợ",
    group: "bao-cao-tai-chinh-chuoi",
    iconKey: "Database",
    navKey: "chain-clearing",
    mobileLabel: "Đối soát",
  },

  // 05 · THIẾT LẬP
  {
    href: "/cai-dat?tab=INFO",
    label: "Hồ sơ thương hiệu",
    group: "thiet-lap-chuoi",
    iconKey: "Building2",
    navKey: "chain-brand-profile",
    capability: "F1",
    mobileLabel: "Hồ sơ",
  },
  {
    href: "/cai-dat",
    label: "Cài đặt chuỗi",
    group: "thiet-lap-chuoi",
    iconKey: "Settings2",
    navKey: "chain-settings",
    capability: "F1",
    mobileLabel: "Cài đặt",
  },
  {
    href: "/cai-dat/thanh-vien",
    label: "Đội ngũ & phân quyền",
    group: "thiet-lap-chuoi",
    iconKey: "Users",
    navKey: "chain-team",
    capability: "F1",
    mobileLabel: "Đội ngũ",
  },
  {
    href: "/audit",
    label: "Nhật ký thao tác",
    group: "thiet-lap-chuoi",
    iconKey: "FileText",
    navKey: "chain-audit",
    capability: "G9",
    mobileLabel: "Nhật ký",
  },
  {
    href: "/cai-dat/thong-bao",
    label: "Ma trận thông báo",
    group: "thiet-lap-chuoi",
    iconKey: "Bell",
    navKey: "chain-notifications",
    capability: "F1",
    mobileLabel: "Thông báo",
  },
  {
    href: "/cai-dat/ma-tran-uudai",
    label: "Ma trận ưu đãi",
    group: "thiet-lap-chuoi",
    iconKey: "Tag",
    navKey: "chain-matrix-promotions",
    capability: "F1",
    mobileLabel: "Ưu đãi",
  },
  {
    href: "/cai-dat/ma-tran-camket",
    label: "Ma trận cam kết",
    group: "thiet-lap-chuoi",
    iconKey: "ShieldCheck",
    navKey: "chain-matrix-commitments",
    capability: "F1",
    mobileLabel: "Cam kết",
  },
  {
    href: "/cai-dat/ma-tran-chinhsach",
    label: "Ma trận chính sách",
    group: "thiet-lap-chuoi",
    iconKey: "FileText",
    navKey: "chain-matrix-policies",
    capability: "F1",
    mobileLabel: "Chính sách",
  },
  {
    href: "/cai-dat/ma-tran-thanhtoan-datco",
    label: "Ma trận thanh toán",
    group: "thiet-lap-chuoi",
    iconKey: "CreditCard",
    navKey: "chain-matrix-payments",
    capability: "F1",
    mobileLabel: "Thanh toán",
  },
  {
    href: "/cai-dat/ma-tran-phigiacong",
    label: "Ma trận phí gia công",
    group: "thiet-lap-chuoi",
    iconKey: "Wrench",
    navKey: "chain-matrix-craft-fees",
    capability: "F1",
    mobileLabel: "Phí thợ",
  },
] as const

export const CHAIN_GROUPS_CONFIG = [
  { key: "dieu-hanh-chuoi", label: "01 · ĐIỀU HÀNH" },
  { key: "cong-cu-chuoi", label: "02 · CÔNG CỤ" },
  { key: "san-pham-kho-chuoi", label: "03 · SẢN PHẨM & KHO" },
  { key: "kinh-doanh-chuoi", label: "04 · KINH DOANH & KHÁCH" },
  { key: "bao-cao-tai-chinh-chuoi", label: "05 · BÁO CÁO & TÀI CHÍNH" },
  { key: "thiet-lap-chuoi", label: "06 · THIẾT LẬP" },
] as const

export function buildChainNav(
  can: (code: string) => boolean,
  role?: RoleUxDefinition | null
): NavView {
  const isAccessible = (item: NavEntry) => !item.capability || can(item.capability)

  const groups: NavGroup[] = []

  for (const config of CHAIN_GROUPS_CONFIG) {
    const groupEntries = CHAIN_NAV_ENTRIES.filter(
      (entry) =>
        entry.group === config.key &&
        isAccessible(entry)
    )
    if (groupEntries.length > 0) {
      groups.push({
        key: config.key,
        label: config.label,
        entries: [...groupEntries],
      })
    }
  }

  return { groups }
}
