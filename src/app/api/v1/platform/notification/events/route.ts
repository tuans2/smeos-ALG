/**
 * PLATFORM NOTIFICATION EVENTS — Dành riêng cho SaaS Mother
 *
 * Trả về tất cả NotificationEventDefinition[] đầy đủ (có roleDefaults)
 * để hook useNotificationMatrix có thể render ma trận đúng cấu trúc.
 *
 * KHÁC với /platform/notification/visibility:
 * - visibility: trả EventVisibilityRow[] (chỉ để Mother configure visibility cho tầng dưới)
 * - events: trả NotificationEventDefinition[] (để render matrix settings của Mother)
 *
 * @module api/platform/notification
 */
import { jsonResponse } from "@/core/http/response"
import { getAllNotificationEvents } from "@/modules/notification/domain/events"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "chỉ đọc danh mục sự kiện tĩnh — mọi người vận hành nền tảng" },
  handler: async ({  }) => {
    // Trả toàn bộ events — Mother thấy tất cả (không lọc theo tier visibility)
    const events = getAllNotificationEvents()
    return jsonResponse({ data: events })
  },
})
