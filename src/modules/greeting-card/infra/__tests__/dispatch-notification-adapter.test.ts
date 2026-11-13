import { describe, expect, it, vi } from "vitest"

import { MultiChannelDispatchNotifier, notDeliveredReason } from "../dispatch-notification-adapter"

const ctx = { organizationId: "org-1", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set<string>() }
const branch = { branchId: "b-1", branchName: "Chi nhánh 1", qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true }

/** Trước đây trả `sent: true` dù không gửi được gì — mốc nhắc bị đánh dấu đã gửi (rà soát M4). */
describe("MultiChannelDispatchNotifier", () => {
  it("chi nhánh không có kênh nào: báo CHƯA gửi", async () => {
    const res = await new MultiChannelDispatchNotifier(async () => []).sendSubcontractInvite(ctx, {
      branch: { ...branch, channels: {} },
      orderCode: "DH261021-0001",
      messageText: "Đơn mới",
      claimUrl: "",
    })
    expect(res.sent).toBe(false)
  })
})

const sendMessage = vi.fn(async () => ({ sent: true, providerMsgId: "1", providerChatId: "-100" }))
vi.mock("../../adapters/staff-channels", () => ({
  getStaffChannelProvider: (channel: string) => (channel === "TELEGRAM" ? { sendMessage, editMessage: vi.fn() } : null),
}))

/** Bot điều phối là bot chung: chỉ gửi tới chat đã nhắn mã liên kết của chính tổ chức (rà soát cụm G). */
describe("MultiChannelDispatchNotifier — chat Telegram đã liên kết", () => {
  const target = { orderCode: "DH261022-0001", messageText: "Đơn mới", claimUrl: "https://app.example/x" }

  it("chat ID chỉ có trong cấu hình chi nhánh (chưa liên kết): không gửi", async () => {
    process.env.TELEGRAM_DISPATCH_BOT_TOKEN = "test-token"
    sendMessage.mockClear()
    const notifier = new MultiChannelDispatchNotifier(async () => ["-999"])
    const res = await notifier.sendSubcontractInvite(ctx, { ...target, branch: { ...branch, channels: { telegramChatId: "-100" } } })
    expect(res.sent).toBe(false)
    expect(sendMessage).not.toHaveBeenCalled()
    // Báo đúng việc cần làm thay vì "không gửi được qua kênh nào"
    expect(res.error).toContain("chưa liên kết")
  })

  it("chat đã liên kết với tổ chức: gửi", async () => {
    process.env.TELEGRAM_DISPATCH_BOT_TOKEN = "test-token"
    sendMessage.mockClear()
    const notifier = new MultiChannelDispatchNotifier(async (orgId) => (orgId === "org-1" ? ["-100"] : []))
    const res = await notifier.sendSubcontractInvite(ctx, { ...target, branch: { ...branch, channels: { telegramChatId: "-100" } } })
    expect(res.sent).toBe(true)
    expect(sendMessage).toHaveBeenCalledTimes(1)
  })
})

describe("notDeliveredReason", () => {
  const base = { requestedChatId: null, telegramLinked: false, botConfigured: true, hasZalo: false }

  it("chỉ ra đúng việc cần làm theo từng trường hợp", () => {
    expect(notDeliveredReason({ ...base, requestedChatId: "-100" })).toContain("chưa liên kết")
    expect(notDeliveredReason({ ...base, requestedChatId: "-100", telegramLinked: true, botConfigured: false })).toContain("chưa bật bot")
    expect(notDeliveredReason({ ...base, requestedChatId: "-100", telegramLinked: true })).toContain("bot còn trong nhóm")
    expect(notDeliveredReason({ ...base, hasZalo: true })).toContain("7 ngày")
    expect(notDeliveredReason(base)).toBe("Chi nhánh chưa có Telegram hoặc Zalo")
  })
})
