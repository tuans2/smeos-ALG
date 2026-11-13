import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["F14"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx }) }))
vi.mock("@/core/rbac/capabilities", () => ({ requireCapability: () => undefined }))

const getTelegramBotInfo = vi.fn(async () => ({ id: 1, is_bot: true, first_name: "Bot", username: "smeos_bot" }))
const getRecentTelegramMessages = vi.fn(async () => messages)
const sendTelegramText = vi.fn(async () => ({ ok: true, messageId: 1 }))
vi.mock("@/modules/integration-hub/adapters/connectors/telegram/telegram-bot-api", () => ({
  getTelegramBotInfo: () => getTelegramBotInfo(),
  sendTelegramText: (...args: unknown[]) => sendTelegramText(...(args as [])),
  getRecentTelegramMessages: () => getRecentTelegramMessages(),
  TelegramUpdatesError: class extends Error {},
}))
// Danh sách chat đã liên kết lưu theo tổ chức (bản trong bộ nhớ thay cho organizations.settings)
const linked = new Map<string, Set<string>>()
const unlinked = new Map<string, Set<string>>()
vi.mock("@/modules/greeting-card/infra/telegram-linked-chats", () => ({
  listLinkedTelegramChatIds: async (orgId: string) => [...(linked.get(orgId) ?? [])],
  rememberLinkedTelegramChats: async (orgId: string, ids: string[]) => {
    linked.set(orgId, new Set([...(linked.get(orgId) ?? []), ...ids]))
  },
  listUnlinkedTelegramChats: async (orgId: string) => Object.fromEntries([...(unlinked.get(orgId) ?? [])].map((id) => [id, new Date().toISOString()])),
  unlinkTelegramChat: async (orgId: string, chatId: string) => {
    linked.get(orgId)?.delete(chatId)
    unlinked.set(orgId, new Set([...(unlinked.get(orgId) ?? []), chatId]))
  },
}))

import { DELETE, GET, POST } from "@/app/api/v1/greeting-card/integrations/telegram-dispatch/route"
import { telegramLinkCode } from "@/modules/greeting-card/infra/telegram-link-code"

let messages: Array<{ chatId: string; title: string; type: string; text: string }> = []

function post(chatId: string): Request {
  return new Request("http://localhost/api/v1/greeting-card/integrations/telegram-dispatch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  })
}

/** Bot điều phối là bot chung — tenant chỉ thấy/gửi được nhóm của chính mình (rà soát 21/10/2026, H1). */
describe("telegram-dispatch route", () => {
  beforeEach(() => {
    process.env.TELEGRAM_DISPATCH_BOT_TOKEN = "test-token"
    sendTelegramText.mockClear()
    getTelegramBotInfo.mockReset().mockImplementation(async () => ({ id: 1, is_bot: true, first_name: "Bot", username: "smeos_bot" }))
    getRecentTelegramMessages.mockReset().mockImplementation(async () => messages)
    linked.clear()
    unlinked.clear()
    messages = [
      { chatId: "-100", title: "Nhóm của A", type: "group", text: telegramLinkCode("org-a") },
      { chatId: "-200", title: "Nhóm của B", type: "group", text: telegramLinkCode("org-b") },
    ]
  })

  it("GET chỉ trả nhóm đã nhắn mã của tổ chức, kèm mã liên kết", async () => {
    const body = (await (await GET(new Request("http://localhost/x"))).json()) as { data: Record<string, unknown> }
    expect(body.data.linkCode).toBe(telegramLinkCode("org-a"))
    expect(body.data.recentChats).toEqual([{ id: "-100", title: "Nhóm của A", type: "group" }])
  })

  it("POST tới nhóm của tenant khác: 422, không gửi gì", async () => {
    const res = await POST(post("-200"))
    expect(res.status).toBe(422)
    expect(sendTelegramText).not.toHaveBeenCalled()
  })

  it("POST tới nhóm đã liên kết: gửi", async () => {
    const res = await POST(post("-100"))
    expect(res.status).toBe(200)
    expect(sendTelegramText).toHaveBeenCalledTimes(1)
  })

  it("nhóm đã liên kết được nhớ lại khi tin nhắn mã đã trôi khỏi bot", async () => {
    await GET(new Request("http://localhost/x"))
    messages = []
    expect((await POST(post("-100"))).status).toBe(200)
  })

  it("chat ID chỉ nằm trong cấu hình chi nhánh (Excel) không được tin", async () => {
    messages = []
    const res = await POST(post("-300"))
    expect(res.status).toBe(422)
    expect(sendTelegramText).not.toHaveBeenCalled()
  })

  it("Telegram lỗi thoáng qua: vẫn giữ nhóm đã liên kết, không báo chưa cấu hình", async () => {
    await GET(new Request("http://localhost/x"))
    getTelegramBotInfo.mockRejectedValueOnce(new Error("timeout"))
    getRecentTelegramMessages.mockRejectedValueOnce(new Error("timeout"))
    const body = await (await GET(new Request("http://localhost/x"))).json()
    expect(body.data.configured).toBe(true)
    expect(body.data.recentChats.map((c: { id: string }) => c.id)).toEqual(["-100"])
    expect(body.data.error).toBeTruthy()
  })

  it("Telegram từ chối gửi: trả đúng lý do cho màn hình (nhóm đã nâng cấp đổi ID)", async () => {
    await GET(new Request("http://localhost/x"))
    sendTelegramText.mockResolvedValueOnce({ ok: false, error: "Bad Request: group chat was upgraded to a supergroup chat" } as never)
    const res = await POST(post("-100"))
    expect(res.status).toBe(422)
    expect(JSON.stringify(await res.json())).toContain("Quét Chat ID mới")
  })

  it("Gỡ nhóm: bot thôi gửi, quét lại không làm nhóm hiện lại (mã cũ)", async () => {
    await GET(new Request("http://localhost/x"))
    const del = await DELETE(new Request("http://localhost/x?chat_id=-100", { method: "DELETE" }))
    expect(del.status).toBe(200)
    const body = await (await GET(new Request("http://localhost/x"))).json()
    expect(body.data.recentChats).toEqual([])
    expect((await POST(post("-100"))).status).toBe(422)
  })

  it("Gỡ nhóm không thuộc cửa hàng: 404", async () => {
    const del = await DELETE(new Request("http://localhost/x?chat_id=-200", { method: "DELETE" }))
    expect(del.status).toBe(404)
  })
})
