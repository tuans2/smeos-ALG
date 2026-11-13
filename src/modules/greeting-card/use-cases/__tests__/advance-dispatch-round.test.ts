import { lockedUpdate } from "./locked-state-store"
import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { BranchCandidate } from "../../domain/chain-dispatch-engine"
import type { SubcontractOrderState } from "../../domain/subcontract-order"
import type { IDispatchNotifier, ISubcontractClaimStore } from "../dispatch-subcontract-order"
import { advanceExpiredDispatchRound } from "../advance-dispatch-round"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "cron", branchId: null, capabilities: new Set() }
const now = new Date("2026-10-22T08:10:00Z")

const branch = (id: string, score: number): BranchCandidate => ({
  branchId: id,
  branchName: `Chi nhánh ${id}`,
  qualityScore: score,
  activeJobsCount: 0,
  maxConcurrentJobs: 5,
  isActive: true,
  channels: { telegramChatId: `chat-${id}` },
})
const branches = [branch("b1", 90), branch("b2", 80), branch("b3", 70), branch("b4", 60)]

const openState = (over: Partial<SubcontractOrderState> = {}): SubcontractOrderState => ({
  orderId: "o1",
  orderCode: "DH-1",
  dispatchStatus: "OPEN",
  currentRound: 1,
  claimedBranchId: null,
  claimedAt: null,
  graceExpiresAt: null,
  declinedBranchIds: [],
  invitedBranchIds: ["b1", "b2"],
  roundExpiresAt: "2026-10-22T08:05:00Z",
  subcontractPriceVnd: 300_000,
  ...over,
})

function setup(state: SubcontractOrderState, statusAtWrite = state.dispatchStatus) {
  let saved: SubcontractOrderState | null = null
  const store: ISubcontractClaimStore = {
    updateSubcontractState: lockedUpdate(() => store),
    saveSubcontractState: vi.fn(),
    loadSubcontractState: vi.fn(),
    saveSubcontractStateIfStatus: vi.fn().mockImplementation(async (_, s, expected) => {
      if (statusAtWrite !== expected) return false
      saved = s
      return true
    }),
  }
  const notifier: IDispatchNotifier = { sendSubcontractInvite: vi.fn().mockResolvedValue({ sent: true }) }
  return { store, notifier, saved: () => saved }
}

const input = (state: SubcontractOrderState, settings: unknown = { chain_dispatch_policy: { top_n: 2, max_rounds: 3 } }) => ({
  state,
  shopSettings: settings,
  branches,
  deliveryAddress: "1 Lê Lợi",
  deliveryTime: "10:00 ngày 2026-10-22",
  baseUrl: "https://app.example",
  coordinatorTelegramChatId: "coord-chat",
})

describe("advanceExpiredDispatchRound", () => {
  it("chưa hết hạn vòng → không làm gì", async () => {
    const state = openState({ roundExpiresAt: "2026-10-22T08:20:00Z" })
    const { store, notifier } = setup(state)
    expect(await advanceExpiredDispatchRound(ctx, input(state), store, notifier, now)).toEqual({ action: "NONE" })
    expect(notifier.sendSubcontractInvite).not.toHaveBeenCalled()
  })

  it("hết hạn vòng 1 → mời vòng 2, loại các chi nhánh đã mời", async () => {
    const state = openState()
    const { store, notifier, saved } = setup(state)
    const res = await advanceExpiredDispatchRound(ctx, input(state), store, notifier, now)

    expect(res).toEqual({ action: "NEXT_ROUND", round: 2, invitedBranchIds: ["b3", "b4"], sentCount: 2 })
    expect(saved()?.currentRound).toBe(2)
    expect(saved()?.previouslyInvitedBranchIds).toEqual(["b1", "b2"])
    expect(saved()?.roundExpiresAt).toBe("2026-10-22T08:15:00.000Z")
    expect(notifier.sendSubcontractInvite).toHaveBeenCalledTimes(2)
  })

  it("đã ở vòng cuối → ESCALATED và báo Điều phối", async () => {
    const state = openState({ currentRound: 3 })
    const { store, notifier, saved } = setup(state)
    const res = await advanceExpiredDispatchRound(ctx, input(state), store, notifier, now)

    expect(res).toEqual({ action: "ESCALATED", reason: "MAX_ROUNDS" })
    expect(saved()?.dispatchStatus).toBe("ESCALATED")
    const call = vi.mocked(notifier.sendSubcontractInvite).mock.calls[0]?.[1]
    expect(call?.branch.channels?.telegramChatId).toBe("coord-chat")
  })

  it("hết ứng viên chưa mời → ESCALATED", async () => {
    const state = openState({ previouslyInvitedBranchIds: ["b3"], declinedBranchIds: ["b4"] })
    const { store, notifier } = setup(state)
    expect(await advanceExpiredDispatchRound(ctx, input(state), store, notifier, now)).toEqual({ action: "ESCALATED", reason: "NO_CANDIDATES" })
  })

  it("chi nhánh vừa nhận đơn lúc quét → không ghi đè, không gửi lời mời", async () => {
    const state = openState()
    const { store, notifier } = setup(state, "CLAIMED_GRACE")
    expect(await advanceExpiredDispatchRound(ctx, input(state), store, notifier, now)).toEqual({ action: "SKIPPED_RACE" })
    expect(notifier.sendSubcontractInvite).not.toHaveBeenCalled()
  })
})
