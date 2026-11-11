/**
 * Phía trình duyệt của Web Push (checklist 4.30): đăng ký service worker `/push-sw.js`, xin quyền, đăng ký với dịch
 * vụ đẩy bằng khoá công khai VAPID của hệ thống, rồi báo máy chủ (`/api/v1/notification/push-subscriptions`).
 */
import { apiSend } from "@/components/greeting-card/greeting-api"

export const PUSH_STATUS_URL = "/api/v1/notification/push-subscriptions"
const SW_URL = "/push-sw.js"

export interface PushStatusView {
  public_key: string | null
  available: boolean
  devices: number
  subscribed: boolean
}

export type PushSupport = "supported" | "unsupported" | "denied"

/** Trình duyệt có hỗ trợ và người dùng có đang chặn thông báo không. */
export function pushSupport(env: { serviceWorker: boolean; pushManager: boolean; permission: NotificationPermission | null }): PushSupport {
  if (!env.serviceWorker || !env.pushManager || env.permission === null) return "unsupported"
  return env.permission === "denied" ? "denied" : "supported"
}

export function currentPushSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported"
  return pushSupport({
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    permission: "Notification" in window ? Notification.permission : null,
  })
}

/** Khoá base64url → mảng byte cho `applicationServerKey`. */
export function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const raw = atob(base64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function currentEndpoint(): Promise<string | null> {
  if (currentPushSupport() === "unsupported") return null
  const reg = await navigator.serviceWorker.getRegistration("/")
  const sub = await reg?.pushManager.getSubscription()
  return sub?.endpoint ?? null
}

export async function enablePush(publicKey: string): Promise<void> {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") throw new Error("Bạn chưa cho phép trình duyệt hiện thông báo")
  await navigator.serviceWorker.register(SW_URL, { scope: "/" })
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }))
  const json = sub.toJSON()
  await apiSend(PUSH_STATUS_URL, "POST", { endpoint: sub.endpoint, keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } }, "Chưa bật được nhận tin")
}

export async function disablePush(): Promise<void> {
  if (currentPushSupport() === "unsupported") return
  const reg = await navigator.serviceWorker.getRegistration("/")
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await apiSend(PUSH_STATUS_URL, "DELETE", { endpoint: sub.endpoint }, "Chưa tắt được nhận tin")
  await sub.unsubscribe()
}
