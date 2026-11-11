/**
 * Luật Web Push thuần (checklist 4.30) — không I/O.
 */
import type { NotificationPayload } from "./notification-payload"

/**
 * Máy chủ sẽ POST tới `endpoint` do trình duyệt khai → chỉ nhận `https` của dịch vụ đẩy thật (chặn SSRF tới
 * địa chỉ nội bộ). Danh sách theo dịch vụ đẩy của Chrome/Edge (FCM), Firefox, Safari, Windows.
 */
const PUSH_SERVICE_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^([a-z0-9-]+\.)*push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/]

export function isAllowedPushEndpoint(raw: string): boolean {
  try {
    const url = new URL(raw)
    return url.protocol === "https:" && !url.port && !url.username && PUSH_SERVICE_HOSTS.some((re) => re.test(url.hostname))
  } catch {
    return false
  }
}

/** Nội dung gửi tới service worker: ngắn, chỉ link tương đối trong ứng dụng. */
export function webPushMessage(payload: Pick<NotificationPayload, "title" | "message" | "deepLink" | "eventKey">): string {
  const url = payload.deepLink && payload.deepLink.startsWith("/") && !payload.deepLink.startsWith("//") ? payload.deepLink : "/"
  return JSON.stringify({ title: payload.title.slice(0, 120), message: payload.message.slice(0, 600), url, tag: payload.eventKey })
}

/** Mức khẩn của tin theo độ ưu tiên sự kiện (header `Urgency`, RFC 8030 §5.3). */
export function webPushUrgency(priority: NotificationPayload["priority"]): "high" | "normal" {
  return priority === "URGENT" || priority === "CRITICAL" ? "high" : "normal"
}
