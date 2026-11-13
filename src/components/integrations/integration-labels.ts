/** Nhãn tiếng Việt cho Trung tâm Tích hợp — không hiện mã kỹ thuật trên màn hình. */

import { formatDateTime as formatViDateTime } from "@/lib/i18n/formatters"
import type { ConnectorAvailability } from "@/modules/integration-hub/domain/catalog-availability"
import type { ConnectorCategory } from "@/modules/integration-hub/domain/connector-manifest"
import type { ConnectionStatus } from "@/modules/integration-hub/domain/connection-lifecycle"

export const CATEGORY_LABEL: Record<ConnectorCategory, string> = {
  SALES_CHANNEL: "Kênh bán hàng",
  MESSAGING: "Nhắn tin & mạng xã hội",
  PAYMENT: "Thanh toán",
  NOTIFICATION: "Thông báo",
  LOGISTICS_INVOICE: "Vận chuyển & hoá đơn",
  CHAIN_STORE: "Chuỗi & cửa hàng",
  API_WEBHOOK: "API & kết nối phần mềm",
}

type Tone = "success" | "warning" | "danger" | "accent" | "neutral"

export const AVAILABILITY_LABEL: Record<Exclude<ConnectorAvailability, "HIDDEN">, { text: string; tone: Tone }> = {
  CONNECTED: { text: "Đã kết nối", tone: "success" },
  AVAILABLE: { text: "Sẵn sàng kết nối", tone: "accent" },
  LEGACY: { text: "Đang dùng ở màn hình cũ", tone: "neutral" },
  INHERITED: { text: "Dùng kết nối của cấp trên", tone: "neutral" },
  LOCKED_BY_UPPER: { text: "Cấp trên đã khoá", tone: "warning" },
  NEEDS_UPGRADE: { text: "Cần nâng gói", tone: "warning" },
  COMING_SOON: { text: "Sắp ra mắt", tone: "neutral" },
  NOT_FOR_TIER: { text: "Quản lý ở cấp trên", tone: "neutral" },
}

export const STATUS_LABEL: Record<ConnectionStatus, { text: string; tone: Tone }> = {
  DRAFT: { text: "Chưa xong", tone: "neutral" },
  CONNECTING: { text: "Đang kết nối", tone: "neutral" },
  ACTIVE: { text: "Đang hoạt động", tone: "success" },
  DEGRADED: { text: "Chập chờn", tone: "warning" },
  EXPIRED: { text: "Hết hạn — cần kết nối lại", tone: "danger" },
  ERROR: { text: "Lỗi — cần xử lý", tone: "danger" },
  DISCONNECTED: { text: "Đã ngắt", tone: "neutral" },
  DISABLED_BY_UPPER: { text: "Cấp trên đã tắt", tone: "warning" },
}

export const EVENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Đang chờ xử lý",
  DONE: "Đã xử lý",
  FAILED: "Lỗi, sẽ tự thử lại",
  DEAD: "Không xử lý được",
}

export const SECRET_LABEL: Record<string, string> = {
  API_KEY: "Khoá API",
  BOT_TOKEN: "Mã bot",
  WEBHOOK_KEY: "Khoá bí mật",
}

export function formatDateTime(iso: string | null): string {
  return iso ? formatViDateTime(iso) || "Chưa có" : "Chưa có"
}
