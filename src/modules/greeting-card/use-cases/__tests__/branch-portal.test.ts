import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { SubcontractOrderState } from "../../domain/subcontract-order"
import { classifyForBranch, listBranchPortalOrders, type IBranchPortalStore } from "../branch-portal"

const now = new Date("2026-10-22T10:00:00Z")
const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "u1", branchId: null, capabilities: new Set(["R14"]) }

const state = (over: Partial<SubcontractOrderState> = {}): SubcontractOrderState => ({
  orderId: "o1", orderCode: "DH-1", dispatchStatus: "OPEN", currentRound: 1,
  claimedBranchId: null, claimedAt: null, graceExpiresAt: null, declinedBranchIds: [],
  invitedBranchIds: ["Q1", "Q2"], roundExpiresAt: "2026-10-22T10:05:00Z", subcontractPriceVnd: 300_000,
  ...over,
})

describe("classifyForBranch", () => {
  it("được mời, còn hạn → INVITED", () => {
    expect(classifyForBranch(state(), "Q1", now)).toEqual({ stage: "INVITED", deadlineAt: "2026-10-22T10:05:00Z" })
  })

  it("không được mời / đã từ chối / hết hạn vòng → không hiện", () => {
    expect(classifyForBranch(state(), "Q9", now)).toBeNull()
    expect(classifyForBranch(state({ declinedBranchIds: ["Q1"] }), "Q1", now)).toBeNull()
    expect(classifyForBranch(state({ roundExpiresAt: "2026-10-22T09:59:00Z" }), "Q1", now)).toBeNull()
  })

  it("chi nhánh khác đã nhận → chi nhánh mình không còn thấy; mình nhận → GRACE rồi IN_PROGRESS", () => {
    const claimedByQ2 = state({ dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "Q2", graceExpiresAt: "2026-10-22T10:03:00Z" })
    expect(classifyForBranch(claimedByQ2, "Q1", now)).toBeNull()
    expect(classifyForBranch(claimedByQ2, "Q2", now)).toEqual({ stage: "GRACE", deadlineAt: "2026-10-22T10:03:00Z" })
    expect(classifyForBranch({ ...claimedByQ2, dispatchStatus: "COMMITTED" }, "Q2", now)?.stage).toBe("IN_PROGRESS")
  })
})

describe("listBranchPortalOrders", () => {
  const row = (s: SubcontractOrderState, code: string) => ({
    metadata: { subcontract_dispatch: s },
    order: { code, delivery_address: { street: "1 Lê Lợi" }, delivery_window: { timeSlot: "10:00", date: "2026-10-22" }, production_status: "WAITING" },
  })

  it("tài khoản chưa gắn chi nhánh → không truy vấn đơn", async () => {
    const store: IBranchPortalStore = { memberChainBranch: vi.fn(async () => null), listBranchDispatches: vi.fn() }
    expect(await listBranchPortalOrders(ctx, store, "https://x", now)).toEqual({ branch: null, orders: [] })
    expect(store.listBranchDispatches).not.toHaveBeenCalled()
  })

  it("chỉ trả đơn chi nhánh còn việc, lời mời lên đầu, link Thẻ Gia Công ký cho đúng chi nhánh", async () => {
    const store: IBranchPortalStore = {
      memberChainBranch: vi.fn(async () => ({ code: "Q1", name: "Chi nhánh Q1" })),
      listBranchDispatches: vi.fn(async () => [
        row(state({ dispatchStatus: "COMMITTED", claimedBranchId: "Q1" }), "DH-A"),
        row(state({ dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "Q2" }), "DH-B"),
        row(state(), "DH-C"),
      ]),
    }
    const res = await listBranchPortalOrders(ctx, store, "https://x", now)
    expect(res.orders.map((o) => [o.orderCode, o.stage])).toEqual([["DH-C", "INVITED"], ["DH-A", "IN_PROGRESS"]])
    expect(store.listBranchDispatches).toHaveBeenCalledWith(ctx, "Q1")
    expect(res.orders[0]?.cardUrl).toMatch(/^https:\/\/x\/subcontract\/DH-C\?branch=Q1&t=/)
    expect(res.orders[0]?.deliveryTime).toBe("10:00 ngày 2026-10-22")
  })
})
