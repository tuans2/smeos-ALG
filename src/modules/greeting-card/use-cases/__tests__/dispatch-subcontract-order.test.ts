import { lockedUpdate } from "./locked-state-store"
import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import {
  executeAutomatedChainDispatch,
  type DispatchOrderInput,
  type IDispatchNotifier,
  type ISubcontractClaimStore,
  type ISubcontractStateStore,
} from "../dispatch-subcontract-order"
import {
  claimSubcontractUseCase,
  cancelClaimSubcontractUseCase,
} from "../handle-subcontract-claim"
import type { BranchCandidate } from "../../domain/chain-dispatch-engine"
import type { SubcontractOrderState } from "../../domain/subcontract-order"

const ctx: TenantContext = {
  organizationId: "org-chain-1",
  workspaceId: "",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(),
}

describe("dispatch-subcontract-order & handle-subcontract-claim use-cases", () => {
  const branches: BranchCandidate[] = [
    {
      branchId: "branch-1",
      branchName: "Chi nhánh Quận 1",
      location: { latitude: 10.775, longitude: 106.701 },
      qualityScore: 95,
      activeJobsCount: 1,
      maxConcurrentJobs: 10,
      isActive: true,
      channels: { telegramChatId: "123456" },
    },
    {
      branchId: "branch-2",
      branchName: "Chi nhánh Quận 3",
      location: { latitude: 10.785, longitude: 106.685 },
      qualityScore: 88,
      activeJobsCount: 2,
      maxConcurrentJobs: 10,
      isActive: true,
    },
    {
      branchId: "branch-3",
      branchName: "Chi nhánh Bình Thạnh",
      location: { latitude: 10.805, longitude: 106.71 },
      qualityScore: 90,
      activeJobsCount: 0,
      maxConcurrentJobs: 10,
      isActive: true,
    },
  ]

  const order: DispatchOrderInput = {
    orderId: "order-1",
    orderCode: "DH-TEST-01",
    deliveryAddress: "72 Lê Thánh Tôn, Bến Nghé, Quận 1",
    deliveryTime: "15:00 20/10/2026",
    deliveryLocation: { latitude: 10.776, longitude: 106.702 },
    subcontractPriceVnd: 450_000,
    baseUrl: "https://demo.avilotusgroup.com",
  }

  it("executeAutomatedChainDispatch gửi lời mời tới Top N chi nhánh và lưu trạng thái OPEN", async () => {
    let savedState: SubcontractOrderState | null = null

    const mockStore: ISubcontractStateStore = {

      updateSubcontractState: lockedUpdate(() => mockStore),
      saveSubcontractState: vi.fn().mockImplementation(async (_, s) => {
        savedState = s
      }),
      loadSubcontractState: vi.fn().mockResolvedValue(null),
    }

    const mockNotifier: IDispatchNotifier = {
      sendSubcontractInvite: vi.fn().mockResolvedValue({ sent: true }),
    }

    const result = await executeAutomatedChainDispatch(
      ctx,
      order,
      branches,
      { chain_dispatch_policy: { enabled: true, top_n: 2 } },
      mockNotifier,
      mockStore
    )

    expect(result.dispatched).toBe(true)
    expect(result.round).toBe(1)
    expect(result.invitedBranchesCount).toBe(2)
    expect(mockNotifier.sendSubcontractInvite).toHaveBeenCalledTimes(2)
    expect(savedState).not.toBeNull()
    expect((savedState as unknown as SubcontractOrderState).dispatchStatus).toBe("OPEN")
    expect((savedState as unknown as SubcontractOrderState).invitedBranchIds).toHaveLength(2)
  })

  it("claimSubcontractUseCase cho phép chi nhánh đầu tiên nhận đơn thành công", async () => {
    let currentState: SubcontractOrderState = {
      orderId: "order-1",
      orderCode: "DH-TEST-01",
      dispatchStatus: "OPEN",
      currentRound: 1,
      claimedBranchId: null,
      claimedBranchName: null,
      claimedAt: null,
      graceExpiresAt: null,
      declinedBranchIds: [],
      invitedBranchIds: ["branch-1", "branch-2"],
      roundExpiresAt: null,
    }

    const mockStore: ISubcontractClaimStore = {
      updateSubcontractState: lockedUpdate(() => mockStore),
      saveSubcontractState: vi.fn().mockImplementation(async (_, s) => {
        currentState = s
      }),
      loadSubcontractState: vi.fn().mockImplementation(async () => currentState),
      saveSubcontractStateIfStatus: vi.fn().mockImplementation(async (_, s, expected) => {
        if (currentState.dispatchStatus !== expected) return false
        currentState = s
        return true
      }),
    }

    const mockNotifier: IDispatchNotifier = {
      sendSubcontractInvite: vi.fn().mockResolvedValue({ sent: true }),
    }

    const claimRes = await claimSubcontractUseCase(
      ctx,
      {
        orderId: "order-1",
        branchId: "branch-1",
        branchName: "Chi nhánh Quận 1",
        shopSettings: { chain_dispatch_policy: { cancellation_grace_minutes: 5 } },
      },
      mockStore,
      mockNotifier,
      branches
    )

    expect(claimRes.success).toBe(true)
    expect(claimRes.claimedBranchId).toBe("branch-1")
    expect(currentState.dispatchStatus).toBe("CLAIMED_GRACE")
    expect(currentState.claimedBranchId).toBe("branch-1")

    // Chi nhánh thứ hai cố gắng nhận sẽ văng lỗi conflict (đã có người nhận)
    await expect(
      claimSubcontractUseCase(
        ctx,
        {
          orderId: "order-1",
          branchId: "branch-2",
          branchName: "Chi nhánh Quận 3",
          shopSettings: {},
        },
        mockStore,
        mockNotifier,
        branches
      )
    ).rejects.toThrow("Đơn hàng này đã được một chi nhánh khác tiếp nhận trước đó")
  })

  it("claimSubcontractUseCase: hai chi nhánh bấm nhận cùng lúc chỉ một chi nhánh thắng", async () => {
    const openState: SubcontractOrderState = {
      orderId: "order-1",
      orderCode: "DH-TEST-02",
      dispatchStatus: "OPEN",
      currentRound: 1,
      claimedBranchId: null,
      claimedBranchName: null,
      claimedAt: null,
      graceExpiresAt: null,
      declinedBranchIds: [],
      invitedBranchIds: ["branch-1", "branch-2"],
      roundExpiresAt: null,
    }
    let stored = openState
    // Kho giả có khoá: đọc–kiểm–ghi không bị lượt khác chen giữa (như SELECT … FOR UPDATE)
    const mockStore: ISubcontractClaimStore = {
      updateSubcontractState: async (_ctx, _orderId, change) => {
        const { next, result } = change(stored)
        if (next) stored = next
        return result
      },
      saveSubcontractState: vi.fn(),
      loadSubcontractState: vi.fn().mockResolvedValue(openState),
      saveSubcontractStateIfStatus: vi.fn(),
    }
    const mockNotifier: IDispatchNotifier = { sendSubcontractInvite: vi.fn().mockResolvedValue({ sent: true }) }

    const results = await Promise.allSettled(
      ["branch-1", "branch-2"].map((branchId) =>
        claimSubcontractUseCase(ctx, { orderId: "order-1", branchId, branchName: branchId, shopSettings: {} }, mockStore, mockNotifier, branches)
      )
    )

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1)
    expect(stored.dispatchStatus).toBe("CLAIMED_GRACE")
  })

  it("cancelClaimSubcontractUseCase hủy trong hạn Grace Period mở lại đơn và loại trừ chi nhánh đã hủy", async () => {
    let currentState: SubcontractOrderState = {
      orderId: "order-1",
      orderCode: "DH-TEST-01",
      dispatchStatus: "CLAIMED_GRACE",
      currentRound: 1,
      claimedBranchId: "branch-1",
      claimedBranchName: "Chi nhánh Quận 1",
      claimedAt: new Date("2026-10-19T08:00:00Z").toISOString(),
      graceExpiresAt: new Date("2026-10-19T08:05:00Z").toISOString(),
      declinedBranchIds: [],
      invitedBranchIds: ["branch-1"],
      roundExpiresAt: null,
    }

    const mockStore: ISubcontractStateStore = {

      updateSubcontractState: lockedUpdate(() => mockStore),
      saveSubcontractState: vi.fn().mockImplementation(async (_, s) => {
        currentState = s
      }),
      loadSubcontractState: vi.fn().mockImplementation(async () => currentState),
    }

    // Hủy lúc 08:02 (hợp lệ)
    const res = await cancelClaimSubcontractUseCase(
      ctx,
      { orderId: "order-1", branchId: "branch-1" },
      mockStore,
      new Date("2026-10-19T08:02:00Z")
    )

    expect(res.success).toBe(true)
    expect(res.reopened).toBe(true)
    expect(currentState.dispatchStatus).toBe("OPEN")
    expect(currentState.claimedBranchId).toBeNull()
    expect(currentState.declinedBranchIds).toContain("branch-1")
  })
})
