/**
 * Ma trận thông báo nhân viên Thẻ Chào (Staff Notification Matrix SSOT).
 * Định nghĩa vai trò nhận, phương thức gửi (OWNER vs BROADCAST), và kênh tương ứng.
 * Pure TypeScript — 100% testable không cần database.
 */
import type {
  StaffNotifyChannel,
  StaffNotifyEvent,
  StaffNotificationContext,
  StaffRecipientTarget,
  ResolvedStaffNotificationTarget,
} from "./staff-notification-types"

/**
 * Ma trận chuẩn hóa SSOT: Sự kiện → Danh sách vai trò tiếp nhận và chính sách kênh.
 */
export const STAFF_NOTIFY_MATRIX: Record<StaffNotifyEvent, StaffRecipientTarget[]> = {
  ORDER_RECEIVED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      // Nếu đơn có Sale gắn kèm (link riêng) -> gửi đúng Sale đó. Nếu đơn vãng lai -> broadcast toàn bộ Sale.
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
  ],

  /** Gate 1b: Điều hành xác nhận đơn (1 Cửa hàng) hoặc Điều phối nhận đơn (Chuỗi) */
  ORDER_ACCEPTED: [
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  PAYMENT_REPORTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  PAYMENT_CONFIRMED: [
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  CANCELLATION_REQUESTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "SMS", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
  ],

  CHANGE_REQUESTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
  ],

  PHOTO_FEEDBACK: [
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
  ],

  READY: [
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  DELIVERY_FAILED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "SMS", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
  ],

  STUCK_DETECTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "CRITICAL",
    },
  ],

  SECOND_PAYMENT_REPORTED: [
    {
      role: "COORDINATOR",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  DISCOUNT_REQUESTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "URGENT",
    },
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX"],
      priority: "NORMAL",
    },
  ],

  // Mẫu mới do nhân viên tạo đã dùng được ngay — Điều hành chỉ cần duyệt sau.
  PRODUCT_PROPOSED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],

  PRODUCT_PROPOSAL_REMINDER: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],

  // Người đề xuất có thể là Sale hoặc Điều phối: OWNER + `assignedSaleId` = người đề xuất
  // gửi đúng người đó bất kể vai (`findRecipientsByRole` lọc theo user khi có id).
  PRODUCT_PROPOSAL_REJECTED: [
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],

  PRODUCT_PROPOSAL_EXPIRED: [
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],

  PRODUCT_CHANGE_REQUESTED: [
    {
      role: "ADMIN",
      dispatchMode: "BROADCAST",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],

  PRODUCT_CHANGE_REVIEWED: [
    {
      role: "SALE",
      dispatchMode: "OWNER",
      channels: ["APP_INBOX", "ZALO", "TELEGRAM", "WHATSAPP", "MESSENGER"],
      priority: "NORMAL",
    },
  ],
}

import { formatIndustryStaffNotificationText } from "./industry-notification-formatter"

/**
 * Định dạng nội dung thông báo nhân viên súc tích, đầy đủ ngữ cảnh nghiệp vụ và thích ứng theo ngành.
 */
export function formatStaffNotificationText(
  event: StaffNotifyEvent,
  ctx: StaffNotificationContext
): { title: string; message: string } {
  return formatIndustryStaffNotificationText(event, ctx)
}

/**
 * Giải quyết danh sách mục tiêu thông báo nhân viên dựa trên ma trận, bối cảnh đơn hàng,
 * và danh sách kênh hợp lệ (được SaaS cho phép VÀ Tiệm đã bật).
 */
export function resolveStaffNotificationTargets(
  event: StaffNotifyEvent,
  ctx: StaffNotificationContext,
  activeChannels: ReadonlySet<StaffNotifyChannel>
): ResolvedStaffNotificationTarget[] {
  const specs = STAFF_NOTIFY_MATRIX[event] || []
  const { title, message } = formatStaffNotificationText(event, ctx)
  const results: ResolvedStaffNotificationTarget[] = []

  const hasAssignedSale = Boolean(ctx.assignedSaleId && ctx.assignedSaleId !== "public")

  for (const spec of specs) {
    // Lọc kênh: Kênh cấu hình phải nằm trong danh sách activeChannels (SaaS allowed && Shop enabled)
    // Riêng APP_INBOX luôn được kích hoạt
    const effectiveChannels = spec.channels.filter((ch) => ch === "APP_INBOX" || activeChannels.has(ch))
    if (effectiveChannels.length === 0) continue

    if (spec.role === "SALE" && spec.dispatchMode === "OWNER") {
      if (hasAssignedSale) {
        // Có Sale phụ trách: gửi đúng người phụ trách
        results.push({
          role: "SALE",
          recipientUserId: ctx.assignedSaleId!,
          channels: effectiveChannels,
          priority: spec.priority,
          title,
          message,
        })
      } else {
        // Đơn vãng lai / chưa có người nhận: BROADCAST tới toàn bộ Sale để không bị sót
        results.push({
          role: "SALE",
          recipientUserId: null,
          channels: effectiveChannels,
          priority: spec.priority,
          title,
          message: `${message} (Đơn chưa có người phụ trách — nhân viên Sale nhận đơn ngay).`,
        })
      }
    } else {
      // Broadcast tới toàn bộ nhân sự có role này
      results.push({
        role: spec.role,
        recipientUserId: null,
        channels: effectiveChannels,
        priority: spec.priority,
        title,
        message,
      })
    }
  }

  return results
}
