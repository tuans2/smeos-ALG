import { lockedUpdate } from "./locked-state-store"
import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { BranchCandidate } from "../../domain/chain-dispatch-engine"
import type { InviteCardRef, SubcontractOrderState } from "../../domain/subcontract-order"
import type { IDispatchNotifier, ISubcontractClaimStore } from "../dispatch-subcontract-order"
import { cancelClaimSubcontractUseCase, claimSubcontractUseCase } from "../handle-subcontract-claim"
import { advanceExpiredDispatchRound } from "../advance-dispatch-round"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "u", branchId: null, capabilities: new Set() }

const card = (id: string): InviteCardRef => ({
  msgId: `m-${id}`, chatId: `chat-${id}`, isCaption: false, text: `<b>Mời ${id}</b>`, claimUrl: `https://x/claim/${id}`,
})
const branch = (id: string): BranchCandidate => ({
  branchId: id, branchName: `CN ${id}`, qualityScore: 90, activeJobsCount: 0, maxConcurrentJobs: 5, isActive: true,
  channels: { telegramChatId: `chat-${id}` },
})

const openState = (over: Partial<SubcontractOrderState> = {}): SubcontractOrderState => ({
  orderId: "o1", orderCode: "DH-1", dispatchStatus: "OPEN", currentRound: 1,
  claimedBranchId: null, claimedAt: null, graceExpiresAt: null, declinedBranchIds: [],
  invitedBranchIds: ["b1", "b2", "b3"], roundExpiresAt: "2026-10-22T08:05:00Z",
  inviteCards: { b1: card("b1"), b2: card("b2"), b3: card("b3") },
  // Thẻ của chi nhánh gửi sau cùng — kiểu ghi đè cũ, không được dùng làm thẻ tiến độ của chi nhánh nhận
  telegramMsgId: "m-b3", telegramChatId: "chat-b3",
  ...over,
})

function harness(initial: SubcontractOrderState) {
  let current = initial
  const store: ISubcontractClaimStore = {
    updateSubcontractState: lockedUpdate(() => store),
    saveSubcontractState: vi.fn().mockImplementation(async (_, s) => { current = s }),
    loadSubcontractState: vi.fn().mockImplementation(async () => current),
    saveSubcontractStateIfStatus: vi.fn().mockImplementation(async (_, s, expected) => {
      if (current.dispatchStatus !== expected) return false
      current = s
      return true
    }),
  }
  const editInviteCard = vi.fn().mockResolvedValue(true)
  // Như adapter thật: sửa thẻ cũ thì không trả msgId mới
  const sendSubcontractInvite = vi.fn().mockImplementation(async (_, target) =>
    target.existingTelegramCard ? { sent: true } : { sent: true, telegramMsgId: "new", telegramChatId: "chat-new" })
  const notifier: IDispatchNotifier = { sendSubcontractInvite, editInviteCard }
  return { store, notifier, editInviteCard, sendSubcontractInvite, state: () => current }
}

describe("thẻ mời nhận đơn trên Telegram", () => {
  it("chi nhánh nhận đơn: thẻ của các chi nhánh khác báo đã có chi nhánh nhận và gỡ nút", async () => {
    const h = harness(openState())
    await claimSubcontractUseCase(ctx, { orderId: "o1", branchId: "b1", branchName: "CN b1", shopSettings: {} }, h.store, h.notifier, [branch("b1")])

    const closed = h.editInviteCard.mock.calls.map((c) => c[1].msgId).sort()
    expect(closed).toEqual(["m-b2", "m-b3"])
    for (const call of h.editInviteCard.mock.calls) {
      expect(call[2]).toContain("đã có chi nhánh khác nhận")
      expect(call[3]).toEqual([])
    }
  })

  it("thẻ tiến độ của chi nhánh nhận là thẻ của chính chi nhánh đó, không phải thẻ gửi sau cùng", async () => {
    const h = harness(openState())
    await claimSubcontractUseCase(ctx, { orderId: "o1", branchId: "b1", branchName: "CN b1", shopSettings: {} }, h.store, h.notifier, [branch("b1")])

    expect(h.state().telegramMsgId).toBe("m-b1")
    expect(h.sendSubcontractInvite.mock.calls[0]?.[1].existingTelegramCard).toMatchObject({ msgId: "m-b1", chatId: "chat-b1" })
  })

  it("huỷ trong hạn kiểm kho: thẻ các chi nhánh còn lại trở về lời mời có nút, thẻ chi nhánh huỷ báo đã huỷ", async () => {
    const now = new Date("2026-10-22T08:01:00Z")
    const h = harness(openState({
      dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "b1", claimedAt: "2026-10-22T08:00:00Z",
      graceExpiresAt: "2026-10-22T08:05:00Z", declinedBranchIds: ["b3"],
      telegramMsgId: "m-b1", telegramChatId: "chat-b1",
    }))
    await cancelClaimSubcontractUseCase(ctx, { orderId: "o1", branchId: "b1" }, h.store, now, h.notifier)

    const byMsg = new Map(h.editInviteCard.mock.calls.map((c) => [c[1].msgId, c]))
    expect(byMsg.get("m-b1")?.[2]).toContain("huỷ nhận đơn")
    expect(byMsg.get("m-b1")?.[3]).toEqual([])
    expect(byMsg.get("m-b2")?.[2]).toBe("<b>Mời b2</b>")
    expect(byMsg.get("m-b2")?.[3]).toEqual([{ text: "👉 Nhận đơn ngay", url: "https://x/claim/b2" }])
    // b3 đã từ chối trước đó → không mở lại thẻ của b3
    expect(byMsg.has("m-b3")).toBe(false)
    expect(h.state().dispatchStatus).toBe("OPEN")
    expect(h.state().telegramMsgId).toBeNull()
  })

  it("sang vòng mới: thẻ vòng cũ báo hết hạn, thẻ vòng mới được ghi nhớ", async () => {
    const h = harness(openState())
    await advanceExpiredDispatchRound(ctx, {
      state: openState(), shopSettings: { chain_dispatch_policy: { top_n: 1 } },
      branches: [branch("b1"), branch("b2"), branch("b3"), branch("b4")],
      deliveryAddress: "1 Lê Lợi", deliveryTime: "10:00", baseUrl: "https://x",
    }, h.store, h.notifier, new Date("2026-10-22T08:10:00Z"))

    expect(h.editInviteCard).toHaveBeenCalledTimes(3)
    expect(h.editInviteCard.mock.calls[0]?.[2]).toContain("hết hạn")
    expect(Object.keys(h.state().inviteCards ?? {})).toEqual(["b4"])
  })
})
