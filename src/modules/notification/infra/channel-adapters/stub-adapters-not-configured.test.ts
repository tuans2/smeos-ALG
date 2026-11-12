import { describe, expect, it, vi } from "vitest"
import { SmsNotificationAdapter, NO_PHONE_ERROR } from "./sms-adapter"
import { ZaloNotificationAdapter } from "./zalo-adapter"
import { WebPushNotificationAdapter } from "./web-push-adapter"
import { NOT_CONFIGURED_ERROR } from "./_channel-adapter.interface"
import type { NotificationPayload } from "../../domain/notification-payload"
import type { ProviderChannel, ProviderConfig } from "../../domain/channel-providers"
import type { IChannelProviderStore } from "../channel-provider-store"

const payload = {
  eventKey: "order.created",
  recipient: { userId: "u1", phone: "0900 000 000" }, // dạng người dùng gõ có dấu cách — adapter chuẩn hoá về 84…
  title: "Đơn mới",
  message: "Có đơn mới",
} as unknown as NotificationPayload

function memoryStore(initial: Partial<Record<ProviderChannel, ProviderConfig>> = {}) {
  const data = { ...initial }
  const locks: ProviderChannel[] = []
  const store: IChannelProviderStore = {
    get: async (channel) => data[channel] ?? null,
    save: async (channel, config) => {
      if (config) data[channel] = config
      else delete data[channel]
    },
    withLock: async (channel, fn) => {
      locks.push(channel)
      return fn(data[channel] ?? null, async (next) => {
        data[channel] = next
      })
    },
  }
  return { store, data, locks }
}

describe("Kênh chưa đăng ký nhà cung cấp không báo gửi thành công", () => {
  const { store } = memoryStore()
  for (const adapter of [new SmsNotificationAdapter(store), new ZaloNotificationAdapter(store), new WebPushNotificationAdapter(store, { listForRecipient: async () => [], removeExpired: async () => undefined, markSuccess: async () => undefined })]) {
    it(`${adapter.channel} trả NOT_CONFIGURED`, async () => {
      const res = await adapter.send(payload)
      expect(res.success).toBe(false)
      expect(res.error).toBe(NOT_CONFIGURED_ERROR)
    })
  }
})

describe("Kênh đã đăng ký nhà cung cấp gửi qua nhà cung cấp đó (4.30)", () => {
  it("SMS: số quốc tế, nội dung không dấu, khoá lấy từ sổ nhà cung cấp", async () => {
    const { store } = memoryStore({ SMS: { provider: "esms", values: { apiKey: "k", secretKey: "s", brandname: "B" } } })
    const sendEsms = vi.fn(async () => ({ messageId: "m1" }))
    const res = await new SmsNotificationAdapter(store, sendEsms).send(payload)
    expect(res).toEqual({ channel: "SMS", success: true, messageId: "m1" })
    expect(sendEsms).toHaveBeenCalledWith(expect.objectContaining({ creds: { apiKey: "k", secretKey: "s", brandname: "B" }, phone: "84900000000", content: "Don moi: Co don moi" }))
  })

  it("SMS: người nhận chưa có số → không gọi nhà cung cấp; nhà cung cấp lỗi → báo lỗi, không báo đã gửi", async () => {
    const { store } = memoryStore({ SMS: { provider: "esms", values: { apiKey: "k", secretKey: "s", brandname: "B" } } })
    const sendEsms = vi.fn(async () => {
      throw new Error("eSMS từ chối (99): sai khoá")
    })
    const adapter = new SmsNotificationAdapter(store, sendEsms)
    const noPhone = await adapter.send({ ...payload, recipient: { ...payload.recipient, phone: undefined } })
    expect(noPhone).toEqual({ channel: "SMS", success: false, error: NO_PHONE_ERROR })
    expect(sendEsms).not.toHaveBeenCalled()
    expect(await adapter.send(payload)).toEqual({ channel: "SMS", success: false, error: "eSMS từ chối (99): sai khoá" })
  })

  const zns = (expiresAt: string): ProviderConfig => ({
    provider: "zalo_zns",
    values: { appId: "a", secretKey: "s", accessToken: "t1", refreshToken: "r1", templateId: "tpl", messageParam: "noi_dung", accessTokenExpiresAt: expiresAt },
  })

  it("Zalo: token còn hạn → gửi không khoá dòng, đúng mẫu và tham số", async () => {
    const { store, locks } = memoryStore({ ZALO: zns(new Date(Date.now() + 3_600_000).toISOString()) })
    const sendZns = vi.fn(async () => ({ messageId: "z1", updatedCredentials: null }))
    const res = await new ZaloNotificationAdapter(store, sendZns).send(payload)
    expect(res).toEqual({ channel: "ZALO", success: true, messageId: "z1" })
    expect(locks).toEqual([])
    expect(sendZns).toHaveBeenCalledWith(expect.objectContaining({ templateId: "tpl", phone: "84900000000", params: { title: "Đơn mới", noi_dung: "Có đơn mới" } }))
  })

  it("Zalo: token sắp hết hạn → làm mới dưới khoá dòng và lưu cặp token mới", async () => {
    const { store, data, locks } = memoryStore({ ZALO: zns(new Date(Date.now() + 60_000).toISOString()) })
    const sendZns = vi.fn(async () => ({
      messageId: "z2",
      updatedCredentials: { appId: "a", secretKey: "s", accessToken: "t2", refreshToken: "r2", accessTokenExpiresAt: "2099-01-01T00:00:00.000Z" },
    }))
    await new ZaloNotificationAdapter(store, sendZns).send(payload)
    expect(locks).toEqual(["ZALO"])
    expect(data.ZALO?.values).toMatchObject({ accessToken: "t2", refreshToken: "r2", accessTokenExpiresAt: "2099-01-01T00:00:00.000Z", templateId: "tpl" })
  })
})
