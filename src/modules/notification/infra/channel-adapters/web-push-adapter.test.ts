import { createECDH, randomBytes } from "node:crypto"
import { describe, expect, it, vi } from "vitest"

import { WebPushNotificationAdapter, NO_DEVICE_ERROR } from "./web-push-adapter"
import { generateVapidKeys } from "../../adapters/web-push-protocol"
import type { NotificationPayload } from "../../domain/notification-payload"
import type { IChannelProviderStore } from "../channel-provider-store"

const vapid = { ...generateVapidKeys(), subject: "mailto:van-hanh@example.com" }
const store: IChannelProviderStore = {
  get: async () => ({ provider: "vapid", values: vapid }),
  save: async () => undefined,
  withLock: async (_c, fn) => fn(null, async () => undefined),
}
const device = (id: string, endpoint: string) => {
  const ua = createECDH("prime256v1")
  ua.generateKeys()
  return { id, endpoint, p256dh: ua.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") }
}
const payload = {
  eventKey: "DELIVERY_REMINDER_DUE",
  recipient: { userId: "u1", roleKey: "coordinator", organizationId: "org-a" },
  title: "Nhắc lịch giao",
  message: "Đơn #DH-1",
  deepLink: "/dieu-phoi",
  priority: "URGENT",
} as NotificationPayload

describe("kênh Web Push (4.30)", () => {
  it("gửi tới thiết bị của người nhận trong đúng tổ chức, header VAPID + aes128gcm; 410 → xoá thiết bị", async () => {
    const devices = {
      listForRecipient: vi.fn(async () => [device("d1", "https://fcm.googleapis.com/fcm/send/1"), device("d2", "https://updates.push.services.mozilla.com/wpush/v2/2")]),
      removeExpired: vi.fn(async () => undefined),
      markSuccess: vi.fn(async () => undefined),
    }
    const fetchImpl = vi.fn(async (url: string, _init?: RequestInit) => new Response(null, { status: url.includes("fcm") ? 201 : 410 }))
    const res = await new WebPushNotificationAdapter(store, devices, fetchImpl).send(payload)
    expect(res).toEqual({ channel: "PUSH", success: true })
    expect(devices.listForRecipient).toHaveBeenCalledWith("org-a", "u1")
    expect(devices.markSuccess).toHaveBeenCalledWith("org-a", "d1")
    expect(devices.removeExpired).toHaveBeenCalledWith("org-a", "d2")
    const init = fetchImpl.mock.calls[0]![1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toMatch(/^vapid t=.+, k=/)
    expect(headers["Content-Encoding"]).toBe("aes128gcm")
    expect(headers.Urgency).toBe("high")
  })

  it("không có thiết bị → báo rõ, không gọi ra ngoài; endpoint lạ trong CSDL → xoá, không gọi", async () => {
    const fetchImpl = vi.fn()
    const none = { listForRecipient: async () => [], removeExpired: vi.fn(), markSuccess: vi.fn() }
    expect(await new WebPushNotificationAdapter(store, none, fetchImpl).send(payload)).toEqual({ channel: "PUSH", success: false, error: NO_DEVICE_ERROR })
    const odd = { listForRecipient: async () => [device("d3", "https://10.0.0.1/x")], removeExpired: vi.fn(async () => undefined), markSuccess: vi.fn() }
    const res = await new WebPushNotificationAdapter(store, odd, fetchImpl).send(payload)
    expect(res.success).toBe(false)
    expect(odd.removeExpired).toHaveBeenCalledWith("org-a", "d3")
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("dịch vụ đẩy lỗi → báo lỗi, không báo đã gửi", async () => {
    const devices = { listForRecipient: async () => [device("d1", "https://fcm.googleapis.com/fcm/send/1")], removeExpired: vi.fn(), markSuccess: vi.fn() }
    const res = await new WebPushNotificationAdapter(store, devices, async () => new Response(null, { status: 500 })).send(payload)
    expect(res).toEqual({ channel: "PUSH", success: false, error: "Dịch vụ đẩy từ chối (500)" })
  })
})
