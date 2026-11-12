import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { ScanSearch } from "@/components/ui/icon-set/scan-search"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Video } from "@/components/ui/icon-set/video"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Rss } from "@/components/ui/icon-set/rss"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Users } from "@/components/ui/icon-set/users"
import { Package } from "@/components/ui/icon-set/package"
import { MessageSquare } from "@/components/ui/icon-set/message-square"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { Zap } from "@/components/ui/icon-set/zap"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"

export type WorkspaceKind = "EXPERIENCE" | "PRODUCTION"
export type FeatureId =
  | "phân-tích-sản-phẩm"
  | "creative-studio"
  | "video-studio"
  | "market-intelligence"
  | "content-engine"
  | "social-publishing"
  | "catalog-website"
  | "crm-khách-hàng"
  | "đơn-hàng-vận-hành"
  | "chat-assistant"
  | "analytics-learning"
  | "ai-features"

export type ModuleStatus = "hoat_dong" | "chua_san_sang" | "chua_co" | "disabled"

export type FeatureStatusMeta = {
  label: string
  dotClass: string
  textClass: string
  bgClass: string
}

export type FeatureItem = {
  id: FeatureId
  name: string
  desc: string
  iconName: keyof typeof FEATURE_ICONS
  status?: ModuleStatus
  statusMeta?: FeatureStatusMeta
  route?: string
  waiting?: boolean
  disabled?: boolean
}

export const FEATURE_ICONS: Record<FeatureId, LucideIcon> = {
  "phân-tích-sản-phẩm": ScanSearch,
  "creative-studio": Sparkles,
  "video-studio": Video,
  "market-intelligence": TrendingUp,
  "content-engine": FileText,
  "social-publishing": Rss,
  "catalog-website": LayoutGrid,
  "crm-khách-hàng": Users,
  "đơn-hàng-vận-hành": Package,
  "chat-assistant": MessageSquare,
  "analytics-learning": BarChart3,
  "ai-features": Zap,
}

export const STATUS_META: Record<ModuleStatus, FeatureStatusMeta> = {
  hoat_dong: { label: "Hoạt động", dotClass: "bg-secondary-text", textClass: "text-secondary-text", bgClass: "bg-success-bg" },
  chua_san_sang: { label: "Chưa sẵn sàng", dotClass: "bg-warning", textClass: "text-warning-text", bgClass: "bg-warning-bg" },
  chua_co: { label: "Chưa có", dotClass: "bg-text-muted", textClass: "text-text-muted", bgClass: "bg-surface-alt" },
  disabled: { label: "Sắp có", dotClass: "bg-text-muted", textClass: "text-text-muted", bgClass: "bg-surface-alt" },
}

export const FEATURES: FeatureItem[] = [
  {
    id: "phân-tích-sản-phẩm",
    name: "Phân tích sản phẩm bằng AI",
    desc: "Chụp ảnh → nhận diện hoa, lá, cấu phần, màu sắc, số lượng",
    iconName: "phân-tích-sản-phẩm",
    status: "hoat_dong",
    route: "/tai-anh",
    waiting: false,
  },
  {
    id: "creative-studio",
    name: "AI Creative Studio",
    desc: "Tối ưu ảnh → Master Image → biến thể marketing",
    iconName: "creative-studio",
    status: "hoat_dong",
    route: "/creative-studio",
    waiting: false,
  },
  {
    id: "video-studio",
    name: "AI Video Studio",
    desc: "Reel · TikTok · Story · Slideshow · Motion ads",
    iconName: "video-studio",
    status: "hoat_dong",
    route: "/video",
    waiting: false,
  },
  {
    id: "market-intelligence",
    name: "Nghiên cứu Thị trường & Xu hướng",
    desc: "Google Trends · SerpApi · Điểm số viral & gợi ý cơ hội nội dung",
    iconName: "market-intelligence",
    status: "hoat_dong",
    route: "/market-intelligence",
    waiting: false,
  },
  {
    id: "content-engine",
    name: "AI Content Engine",
    desc: "Sinh nội dung theo kênh: Facebook · Instagram · TikTok · Zalo",
    iconName: "content-engine",
    status: "hoat_dong",
    route: "/noi-dung",
    waiting: false,
  },
  {
    id: "social-publishing",
    name: "Social Publishing",
    desc: "Lịch đăng, xem trước nền tảng, đăng lại thông minh",
    iconName: "social-publishing",
    status: "hoat_dong",
    route: "/lich-dang",
    waiting: false,
  },
  {
    id: "catalog-website",
    name: "Catalog & Website",
    desc: "Catalog số + QR, Landing page chiến dịch",
    iconName: "catalog-website",
    status: "hoat_dong",
    route: "/catalog",
    waiting: false,
  },
  {
    id: "crm-khách-hàng",
    name: "CRM & Khách hàng",
    desc: "Hồ sơ, ngày đặc biệt, nhắc mua, hội thoại",
    iconName: "crm-khách-hàng",
    status: "hoat_dong",
    route: "/khach-hang",
    waiting: false,
  },
  {
    id: "đơn-hàng-vận-hành",
    name: "Đơn hàng & Vận hành",
    desc: "Tạo đơn, phiếu chào giá, bảng Kanban, SLA",
    iconName: "đơn-hàng-vận-hành",
    status: "hoat_dong",
    route: "/don-hang",
    waiting: false,
  },
  {
    id: "chat-assistant",
    name: "AI Chat Assistant",
    desc: "Tư vấn E-Catalog, Messenger, Zalo OA & Copilot 24/7",
    iconName: "chat-assistant",
    status: "hoat_dong",
    route: "/hoi-thoai",
    waiting: false,
  },
  {
    id: "analytics-learning",
    name: "Analytics & Learning",
    desc: "Số liệu, ROI, vòng học phong cách",
    iconName: "analytics-learning",
    status: "chua_san_sang",
    route: "/so-lieu",
  },
  {
    id: "ai-features",
    name: "Tính năng AI cho sản phẩm",
    desc: "Chọn từng tính năng Creative, Video, Content, Catalog, Landing",
    iconName: "ai-features",
    status: "disabled",
    disabled: true,
  },
]

export type MockSession = {
  userName: string
  userEmail?: string | undefined
  /** Đang dùng mật khẩu tạm — bắt buộc đổi trước khi dùng (checklist ALG 1.4). */
  mustChangePassword?: boolean | undefined
  userInitials: string
  orgName: string
  workspaceKind: WorkspaceKind
  capabilities: string[]
  /** Mã năng lực nền tảng (N…) nếu người dùng là người vận hành nền tảng — rỗng nếu không. */
  platformCapabilities?: string[] | undefined
  /** Người vận hành nền tảng đang xem trước một tầng/vai khác vai thật. */
  tierPreviewActive?: boolean | undefined
  organization?: {
    id: string
    name?: string
    industry?: string
    industryLocked?: boolean
    /** Mục điều hướng Admin SaaS ẩn cho ngành của tổ chức; `null` = dùng mặc định của ngành. */
    navHiddenKeys?: string[] | null
    /** Danh sách công cụ được cấp trên (Chuỗi/Ngành) phê duyệt mở khóa; `null` = dùng mặc định. */
    unlockedTools?: string[] | null
    /** Vòng đời tổ chức (ADR-016 D-S5) — banner "tạm ngưng" / "chỉ xem" (audit User Journey UJ-26). */
    lifecycleStatus?: string
  } | undefined
  /**
   * Khoá vai phân quyền (`roles.key`) của membership hiện tại — CHỈ dùng để
   * chọn khuôn trải nghiệm (`resolveRoleUx`, đặc tả 03b). Không bao giờ dùng
   * để suy quyền: quyền vẫn là `capabilities`.
   */
  roleKey?: string | null | undefined
  /** `organizations.type` — EXPERIENCE · SINGLE · CHAIN. */
  organizationType?: string | null | undefined
  /** Yêu cầu chuyển đổi mô hình đang chờ Admin SaaS duyệt (nếu có) */
  pendingModelChange?: {
    requested_type: string
    requested_at: string
    requested_by?: string
    note?: string | null
  } | null | undefined
}

export const MOCK_SESSION: MockSession = {
  userName: "Tony Nguyễn",
  userInitials: "TN",
  orgName: "Siin Store",
  workspaceKind: "PRODUCTION",
  capabilities: ["H3", "I2", "B4"],
  organization: { id: "org_mock_default", name: "Siin Store" },
}

export const SAMPLE_PRODUCTS = [
  { id: "p1", name: "Bó hồng đỏ 20 cành", category: "Sản phẩm", tint: "#FBEAEC", color: "#E48692" },
  { id: "p2", name: "Giỏ hoa chúc mừng", category: "Giỏ hoa", tint: "#EEF4EE", color: "#174C3C" },
  { id: "p3", name: "Hộp hoa hồng phấn", category: "Hộp hoa", tint: "#FBEAEC", color: "#E48692" },
  { id: "p4", name: "Bình hoa để bàn", category: "Bình hoa", tint: "#F5EEE3", color: "#B08D57" },
  { id: "p5", name: "Kệ hoa khai trương", category: "Kệ hoa", tint: "#E7EEE6", color: "#5F9670" },
  { id: "p6", name: "Lẵng hoa chia buồn", category: "Lẵng hoa", tint: "#E7EEE6", color: "#5F9670" },
] as const

export const PENDING_APPROVALS = [
  { id: "a1", name: "Bó hồng đỏ 20 cành", meta: "Sale · Nguyễn Hà · 10 phút trước", tint: "#FBEAEC", color: "#E48692" },
  { id: "a2", name: "Hộp hoa hồng phấn", meta: "Sale · Trần Minh · 40 phút trước", tint: "#EEF4EE", color: "#174C3C" },
  { id: "a3", name: "Kệ hoa khai trương", meta: "Sale · Nguyễn Hà · 1 giờ trước", tint: "#E7EEE6", color: "#5F9670" },
]

export const TRIAL_LIMIT = 20
