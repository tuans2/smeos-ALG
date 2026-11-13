import { afterEach, describe, expect, it, vi } from "vitest"

const { sendEmail } = vi.hoisted(() => ({
  sendEmail: vi.fn(async (_: { to: string; subject: string; html: string }) => undefined),
}))
vi.mock("@/core/notifications/email-service", () => ({ sendEmail }))

import { EmailNotificationAdapter } from "./email-adapter"
import { TelegramNotificationAdapter } from "./telegram-adapter"
import type { NotificationPayload } from "../../domain/notification-payload"

const payload = (over: Partial<NotificationPayload> = {}): NotificationPayload =>
  ({
    eventKey: "ORDER_RECEIVED",
    recipient: { userId: "u1", organizationId: "org-1", roleKey: "florist", email: "a@example.com" },
    title: 'Đơn <img src=x onerror="alert(1)">',
    message: "Hẻm 5 <cạnh chợ> & ngõ",
    priority: "NORMAL",
    ...over,
  }) as NotificationPayload

describe("adapter thông báo thoát ký tự & không rò dữ liệu (AUD-016)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    sendEmail.mockClear()
  })

  it("email: tiêu đề/nội dung được thoát HTML, link javascript: bị bỏ", async () => {
    await new EmailNotificationAdapter().send(payload({ deepLink: "javascript:alert(1)" }))
    const html = sendEmail.mock.calls[0]![0].html
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;img")
    expect(html).toContain("&lt;cạnh chợ&gt; &amp; ngõ")
    expect(html).not.toContain("javascript:")
  })

  it("email: giữ link https hợp lệ", async () => {
    await new EmailNotificationAdapter().send(payload({ deepLink: "https://app.example.com/don-hang/1" }))
    expect(sendEmail.mock.calls[0]![0].html).toContain('href="https://app.example.com/don-hang/1"')
  })

  it("email: mang nhận diện ALG (tiêu đề [ALG], nút màu chính #133D31)", async () => {
    await new EmailNotificationAdapter().send(payload({ deepLink: "https://app.example.com/don-hang/1" }))
    const mail = sendEmail.mock.calls[0]![0]
    expect(mail.subject.startsWith("[ALG] ")).toBe(true)
    expect(mail.html).toContain("background-color: #133D31")
    expect(mail.html).not.toContain("#2563eb")
  })

  it("telegram: thiếu chatId người nhận thì không gửi về chat mặc định dùng chung", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    vi.stubEnv("TELEGRAM_DEFAULT_CHAT_ID", "shared-chat")
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const res = await new TelegramNotificationAdapter().send(payload())
    expect(res.success).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("telegram: nội dung được thoát HTML", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } })))
    vi.stubGlobal("fetch", fetchSpy)
    const p = payload()
    await new TelegramNotificationAdapter().send({ ...p, recipient: { ...p.recipient, telegramChatId: "42" } })
    const body = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(body.text).toContain("&lt;cạnh chợ&gt; &amp; ngõ")
    expect(body.text).not.toContain("<img")
  })

  it("telegram: link tương đối khi chưa có NEXTAUTH_URL dùng cổng dev 3200", async () => {
    vi.stubEnv("TELEGRAM_BOT_TOKEN", "test-token")
    vi.stubEnv("NEXTAUTH_URL", undefined)
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ ok: true, result: { message_id: 1 } })))
    vi.stubGlobal("fetch", fetchSpy)
    const p = payload({ deepLink: "/don-hang/1" })
    await new TelegramNotificationAdapter().send({ ...p, recipient: { ...p.recipient, telegramChatId: "42" } })
    const body = JSON.parse(String((fetchSpy.mock.calls[0] as unknown as [string, RequestInit])[1].body))
    expect(JSON.stringify(body.reply_markup)).toContain("http://127.0.0.1.nip.io:3200/don-hang/1")
  })
})
