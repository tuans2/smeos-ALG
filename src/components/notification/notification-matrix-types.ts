/**
 * NOTIFICATION MATRIX UI — Shared Types
 *
 * Kiểu dữ liệu dùng chung cho tất cả tầng khi render ma trận
 * quản lý notification (Mother, Industry, Chain, Store).
 */

import type * as React from "react"
import type {
  NotificationTier,
  NotifyChannel,
  NotifyPriority,
  NotificationEventGroup,
} from "@/modules/notification/domain/events/_contract"

/** Tầng xem ma trận — quyết định UI behavior */
export type MatrixViewerTier = NotificationTier

/** Trạng thái 1 ô trong ma trận event×channel */
export interface MatrixCellState {
  eventKey: string
  channel: NotifyChannel
  enabled: boolean
  priority: NotifyPriority
  /** Tầng nào quyết định giá trị hiện tại */
  decidedBy: string
  /** Bị hard lock bởi tầng nào — nếu có thì toggle bị disabled */
  hardLockedBy: NotificationTier | null
  hardLockReason?: string | undefined
  /** Có phải hard lock do tầng đang xem tự đặt không */
  isOwnHardLock: boolean
}

/** Hàng dữ liệu 1 event trong ma trận */
export interface MatrixEventRow {
  eventKey: string
  label: string
  description: string
  group: NotificationEventGroup
  tier: NotificationTier
  iconName?: string | undefined
  /** Trạng thái từng channel */
  channels: Record<string, MatrixCellState>
}

/** Nhóm event gom theo NotificationEventGroup */
export interface MatrixEventGroupSection {
  groupKey: NotificationEventGroup
  groupLabel: string
  events: MatrixEventRow[]
}

/** Props cho component ma trận chính */
export interface NotificationMatrixProps {
  viewerTier: MatrixViewerTier
  /** Tiêu đề trang */
  title: string
  /** Mô tả ngắn */
  description: string
  /** Scope ID (GLOBAL cho Mother, org_id cho Industry/Chain, store_org_id cho Store) */
  scopeId: string
  /** Các channel khả dụng (Mother kích hoạt) */
  activeChannels: NotifyChannel[]
  /** Dữ liệu ma trận */
  sections: MatrixEventGroupSection[]
  /** Hard Lock có được phép tại tầng này không */
  canManageHardLocks: boolean
  /** Callback khi toggle 1 ô */
  onToggleCell: (eventKey: string, channel: NotifyChannel, enabled: boolean) => Promise<void>
  /** Callback khi đặt/gỡ hard lock */
  onToggleHardLock?: ((eventKey: string, channel: NotifyChannel, enabled: boolean, reason?: string) => Promise<void>) | undefined
  /** Callback khi gỡ hard lock */
  onRemoveHardLock?: ((eventKey: string, channel: NotifyChannel) => Promise<void>) | undefined
  /** Loading state */
  loading?: boolean | undefined
  /** Error message nếu events API fail */
  error?: string | null | undefined
  /** Khối riêng của tầng hiện trang (vd. Kênh liên lạc ở tầng Mẹ), đặt ngay dưới thẻ hướng dẫn. */
  beforeMatrix?: React.ReactNode | undefined
}

/** Label tiếng Việt cho các nhóm sự kiện */
export const EVENT_GROUP_LABELS: Record<NotificationEventGroup, string> = {
  ORDER: "Đơn hàng",
  PAYMENT: "Thanh toán",
  PRODUCTION: "Sản xuất & Chế tác",
  DISPATCH: "Điều phối",
  QC: "Kiểm soát chất lượng",
  NETWORK: "Mạng lưới & Đối tác",
  PRODUCT: "Sản phẩm & Danh mục",
  AI: "AI & Tự động hóa",
  CRM: "Khách hàng & CSKH",
  FINANCE: "Tài chính & Đối soát",
  TENANT: "Quản trị Tổ chức",
  INFRA: "Hạ tầng & Hệ thống",
  SECURITY: "Bảo mật",
  MARKETING: "Nội dung & Kênh bán",
  CUSTOM: "Tùy chỉnh",
}

/** Label tiếng Việt cho kênh gửi */
export const CHANNEL_LABELS: Record<string, string> = {
  APP_INBOX: "Hộp thư",
  EMAIL: "Email",
  PUSH: "Push",
  TELEGRAM: "Telegram",
  ZALO: "Zalo",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
}

/** Icon keys cho kênh gửi (lucide-react) */
export const CHANNEL_ICON_KEYS: Record<string, string> = {
  APP_INBOX: "Inbox",
  EMAIL: "Mail",
  PUSH: "Bell",
  TELEGRAM: "Send",
  ZALO: "MessageCircle",
  SMS: "Smartphone",
  WHATSAPP: "Phone",
  MESSENGER: "MessageSquare",
}

/** Label tiếng Việt cho tầng */
export const TIER_LABELS: Record<NotificationTier, string> = {
  MOTHER: "Nền tảng (Mother)",
  INDUSTRY: "Ngành (Industry)",
  CHAIN: "Chuỗi (Chain)",
  STORE: "Cửa hàng (Store)",
}
