import { afterEach, describe, expect, it, vi } from "vitest"
import { getTelegramBotInfo, sendTelegramText } from "@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api"

const bot = { id: 1, is_bot: true, first_name: "Bot", username: "smeos_bot" }

/** Lỗi mạng thoáng qua với Telegram: đọc được thử lại 1 lần, gửi tin thì không (tránh gửi trùng). */
describe("telegram-bot-api network retry", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("getMe lỗi mạng lần đầu rồi thành công", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, result: bot })))
    vi.stubGlobal("fetch", fetchMock)
    expect(await getTelegramBotInfo("t")).toEqual(bot)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("getMe lỗi mạng mãi: chỉ thử 2 lần rồi ném lỗi", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(getTelegramBotInfo("t")).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("sendMessage lỗi mạng: không gửi lại", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("fetch failed"))
    vi.stubGlobal("fetch", fetchMock)
    await expect(sendTelegramText("t", "-100", "hi")).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
