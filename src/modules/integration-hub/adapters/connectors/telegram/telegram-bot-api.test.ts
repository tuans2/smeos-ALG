import { afterEach, describe, expect, it, vi } from "vitest"
import { getRecentTelegramMessages, TelegramUpdatesError } from "./telegram-bot-api"

function mockFetch(body: unknown) {
  const fn = vi.fn(async () => ({ json: async () => body }) as unknown as Response)
  vi.stubGlobal("fetch", fn)
  return fn
}

/** 23/10/2026: quét nhóm không thấy mã liên kết vừa gửi — chỉ đọc 100 tin cũ nhất, lỗi Telegram bị nuốt. */
describe("getRecentTelegramMessages", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("đọc 100 tin MỚI NHẤT (offset âm) và lấy cả tin đã sửa", async () => {
    const fetchFn = mockFetch({
      ok: true,
      result: [
        { message: { chat: { id: -100, title: "Nhóm A", type: "supergroup" }, text: "@bot ALG-ABC" } },
        { edited_message: { chat: { id: -200, title: "Nhóm B", type: "group" }, text: "ALG-XYZ" } },
      ],
    })
    const msgs = await getRecentTelegramMessages("t")
    expect(String((fetchFn.mock.calls[0] as unknown[])[0])).toContain("getUpdates?offset=-100&limit=100")
    expect(msgs.map((m) => [m.chatId, m.text])).toEqual([["-100", "@bot ALG-ABC"], ["-200", "ALG-XYZ"]])
  })

  it("bot đang gắn webhook ở nơi khác → báo lỗi rõ ràng thay vì trả rỗng", async () => {
    mockFetch({ ok: false, error_code: 409, description: "Conflict: can't use getUpdates method while webhook is active" })
    await expect(getRecentTelegramMessages("t")).rejects.toMatchObject({ reason: "WEBHOOK_ACTIVE" })
  })

  it("hai hệ thống cùng đọc tin của một bot → báo xung đột", async () => {
    mockFetch({ ok: false, error_code: 409, description: "Conflict: terminated by other getUpdates request" })
    const err = await getRecentTelegramMessages("t").catch((e: unknown) => e)
    expect(err).toBeInstanceOf(TelegramUpdatesError)
    expect((err as TelegramUpdatesError).reason).toBe("CONFLICT")
  })
})
