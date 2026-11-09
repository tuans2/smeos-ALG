/**
 * tool-registry.ts — Toolkit SSOT Registry & Tier Projection Engine
 *
 * Single Source of Truth (SSOT) cho toàn bộ 48+ công cụ trên nền tảng smeOS.
 * - Quản lý tập trung mọi metadata của công cụ (ID, Tên, Đường dẫn, Icon, Năng lực, Trạng thái).
 * - Cung cấp ma trận phân bổ công cụ theo 3 Tầng sử dụng:
 *     + INDUSTRY: SaaS Ngành (Tầng 2)
 *     + CHAIN: ChainOS (Tầng 3)
 *     + STORE: StoreOS (Tầng 4)
 * - Tầng 1 (SaaS Mother) quản trị bật/tắt ma trận công cụ tập trung.
 * - Tuân thủ Domain Purity: 100% thuần TypeScript, Zero ORM.
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"
import type { NavEntry } from "@/components/layout/nav/nav-types"
import { PRIVATE_COLLECTION, PUBLIC_COLLECTION } from "./collection-names"

/** Kiểu tầng duy nhất — `core/governance/layered-resolver.ts`. */
export type PlatformTier = GovernanceTier

export type ToolCategory =
  | "AI_CREATIVE"       // Studio AI, Ảnh, Video, Nội dung
  | "SALES_CHANNELS"    // Catalog, Landing Page, Thẻ chào, QR
  | "PRICING_PROPOSAL"  // Tính giá, Báo giá, Dự toán
  | "PRODUCTION_PRINT"  // Kho mẫu ấn phẩm, Quản lý sản xuất, In ấn
  | "NETWORK_CHAIN"     // Quản lý bộ sưu tập, Điều phối, Mạng lưới

export type ToolDeploymentStatus = "ACTIVE" | "IN_PROGRESS" | "PLANNED" | "DISABLED"

export interface PlatformToolItem {
  /** Mã định danh số 1-48 */
  readonly id: number
  /** Khóa duy nhất dạng kebab-case */
  readonly key: string
  /** Tên hiển thị chuẩn tiếng Việt */
  readonly name: string
  /** Mô tả giá trị cốt lõi */
  readonly description: string
  /** Đường dẫn kích hoạt công cụ */
  readonly href: string
  /** Icon hiển thị (Lucide key) */
  readonly iconKey: string
  /** Nhóm phân loại nghiệp vụ */
  readonly category: ToolCategory
  /** Mã năng lực RBAC yêu cầu (nếu có) */
  readonly capability?: string
  /** Các tầng được phép sử dụng công cụ này */
  readonly supportedTiers: readonly PlatformTier[]
  /** Trạng thái triển khai */
  readonly status: ToolDeploymentStatus
  /** Có ghim cố định lên thanh điều hướng sidebar của các tầng hay không */
  readonly isPinnedToSidebar: boolean
  /** Nhãn ngắn trên mobile */
  readonly mobileLabel?: string
}

/**
 * BẢNG ĐĂNG KÝ CÔNG CỤ NỀN TẢNG (SSOT TOOL REGISTRY)
 */
export const PLATFORM_TOOL_REGISTRY: readonly PlatformToolItem[] = [
  // ── NHÓM 1: BÁN HÀNG & TRƯNG BÀY (SALES & CHANNELS) ─────────────────
  {
    id: 1,
    key: "tool-catalog",
    name: PUBLIC_COLLECTION.name,
    description: PUBLIC_COLLECTION.hint,
    href: "/catalog",
    iconKey: "Globe",
    category: "SALES_CHANNELS",
    capability: "J1",
    supportedTiers: ["INDUSTRY", "CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: PUBLIC_COLLECTION.mobileLabel,
  },
  {
    id: 2,
    key: "tool-greeting-card",
    name: PRIVATE_COLLECTION.name,
    description: PRIVATE_COLLECTION.hint,
    href: "/the-chao",
    iconKey: "Sparkles",
    category: "SALES_CHANNELS",
    capability: "R1",
    supportedTiers: ["INDUSTRY", "CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: PRIVATE_COLLECTION.mobileLabel,
  },
  {
    id: 3,
    key: "tool-landing-page",
    name: "Landing Page & Kênh bán",
    description: "Trang đích bán hàng thương mại cho ngành và chiến dịch",
    href: "/landing-page",
    iconKey: "Globe",
    category: "SALES_CHANNELS",
    supportedTiers: ["INDUSTRY", "CHAIN"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Landing",
  },
  {
    id: 4,
    key: "tool-templates",
    name: "Kho mẫu & Ấn phẩm",
    description: "Thư viện mẫu in ấn A6, Tag treo, Thiệp chúc, Menu chuẩn ngành",
    href: "/kho-templates",
    iconKey: "LayoutTemplate",
    category: "PRODUCTION_PRINT",
    supportedTiers: ["INDUSTRY", "CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Kho mẫu",
  },

  // ── NHÓM 2: SÁNG TẠO AI & MEDIA (AI CREATIVE SUITE) ──────────────────
  {
    id: 5,
    key: "tool-creative-studio",
    name: "Studio sáng tạo AI",
    description: "Tạo ảnh sản phẩm chuyên nghiệp chuẩn studio bằng AI Single-Call",
    href: "/creative-studio",
    iconKey: "Wand2",
    category: "AI_CREATIVE",
    capability: "I1",
    supportedTiers: ["INDUSTRY", "CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Studio AI",
  },
  {
    id: 6,
    key: "tool-scan-photo",
    name: "Phân tích ảnh bằng AI",
    description: "Quét ảnh thực tế, nhận diện thành phần nguyên liệu và cấu trúc",
    href: "/tai-anh",
    iconKey: "Camera",
    category: "AI_CREATIVE",
    capability: "H1",
    supportedTiers: ["CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Quét ảnh",
  },
  {
    id: 7,
    key: "tool-video",
    name: "Công cụ ảnh & Video",
    description: "Dựng video marketing và bộ ảnh quảng cáo từ ảnh chụp sản phẩm",
    href: "/video",
    iconKey: "Video",
    category: "AI_CREATIVE",
    capability: "I1",
    supportedTiers: ["CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Video",
  },
  {
    id: 8,
    key: "tool-content",
    name: "Viết nội dung marketing",
    description: "Sinh caption, bài đăng mạng xã hội và kịch bản bán hàng đa kênh",
    href: "/noi-dung",
    iconKey: "FileText",
    category: "AI_CREATIVE",
    capability: "I1",
    supportedTiers: ["STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Nội dung",
  },

  // ── NHÓM 3: ĐỊNH GIÁ & QUẢN TRỊ MẠNG LƯỚI (PRICING & NETWORK) ──────
  {
    id: 9,
    key: "tool-pricing",
    name: "Tính giá thành",
    description: "Tính giá vốn định lượng BOM, tỷ suất lợi nhuận và gợi ý giá bán",
    href: "/gia",
    iconKey: "WalletCards",
    category: "PRICING_PROPOSAL",
    capability: "L1",
    supportedTiers: ["CHAIN", "STORE"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Tính giá",
  },
  {
    id: 10,
    key: "tool-chain-collections",
    name: "Quản lý bộ sưu tập & Giá",
    description: "Điều phối bảng giá chung, chính sách chiết khấu và bộ sưu tập chuỗi",
    href: "/bo-suu-tap",
    iconKey: "Layers",
    category: "NETWORK_CHAIN",
    capability: "L1",
    supportedTiers: ["CHAIN"],
    status: "ACTIVE",
    isPinnedToSidebar: true,
    mobileLabel: "Giá chuỗi",
  },
] as const

/**
 * Chiếu danh sách công cụ SSOT thành NavEntry[] dành cho Sidebar theo từng Tầng
 */
export function getSidebarToolsForTier(
  tier: PlatformTier,
  options?: {
    can?: (code: string) => boolean
    sidebarGroupKey?: string
    includeToolkitHub?: boolean
  }
): NavEntry[] {
  const { can, sidebarGroupKey = "cong-cu", includeToolkitHub = false } = options ?? {}

  const entries: NavEntry[] = []

  // Tùy chọn ghim trang Thư viện công cụ tổng hợp (/cong-cu) ở đầu cho StoreOS
  if (includeToolkitHub && tier === "STORE") {
    entries.push({
      href: "/cong-cu",
      label: "Thư viện công cụ",
      group: sidebarGroupKey,
      iconKey: "LayoutGrid",
      navKey: "toolkit",
      mobileLabel: "Công cụ",
    })
  }

  for (const tool of PLATFORM_TOOL_REGISTRY) {
    if (!tool.isPinnedToSidebar || tool.status !== "ACTIVE") continue
    if (!tool.supportedTiers.includes(tier)) continue
    if (tool.capability && can && !can(tool.capability)) continue

    // Định danh navKey theo format chuẩn của sidebar
    let navKeyPrefix = ""
    if (tier === "INDUSTRY") navKeyPrefix = "industry-"
    else if (tier === "CHAIN") navKeyPrefix = "chain-"

    // Tự chuẩn hóa navKey khớp với bảng matrix hiện hành
    const baseNavKey = tool.key.replace(/^tool-/, "")
    const navKey = navKeyPrefix ? `${navKeyPrefix}${baseNavKey}` : baseNavKey

    const entry: NavEntry = {
      href: tool.href,
      label: tool.name,
      group: sidebarGroupKey,
      iconKey: tool.iconKey,
      navKey,
      mobileLabel: tool.mobileLabel ?? tool.name,
    }
    if (tool.capability) {
      entry.capability = tool.capability
    }

    entries.push(entry)
  }

  return entries
}

/**
 * Lấy toàn bộ công cụ của nền tảng theo trạng thái và bộ lọc
 */
export function getToolkitTools(filter?: {
  tier?: PlatformTier
  category?: ToolCategory
  activeOnly?: boolean
}): readonly PlatformToolItem[] {
  return PLATFORM_TOOL_REGISTRY.filter((tool) => {
    if (filter?.activeOnly && tool.status !== "ACTIVE") return false
    if (filter?.tier && !tool.supportedTiers.includes(filter.tier)) return false
    if (filter?.category && tool.category !== filter.category) return false
    return true
  })
}
