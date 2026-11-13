import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"

import type { SubcontractOrderState } from "../../domain/subcontract-order"
import { commitSubcontractClaim } from "../commit-subcontract-claim"
import { lockedUpdate } from "./locked-state-store"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "org-1", userId: "cron", branchId: null, capabilities: new Set() }
const now = new Date("2026-10-22T10:00:00Z")

function setup(state: Partial<SubcontractOrderState>) {
  let current: SubcontractOrderState = {
    orderId: "o1", orderCode: "DH1", dispatchStatus: "CLAIMED_GRACE", currentRound: 1, claimedBranchId: "CN1", claimedBranchName: "Quận 1",
    claimedAt: now.toISOString(), graceExpiresAt: new Date(now.getTime() - 60_000).toISOString(), declinedBranchIds: [], invitedBranchIds: ["CN1"], roundExpiresAt: null,
    ...state,
  } as SubcontractOrderState
  const store = {
    loadSubcontractState: vi.fn(async () => current),
    saveSubcontractState: vi.fn(async (_c: TenantContext, next: SubcontractOrderState) => { current = next }),
  }
  const notifier = { sendSubcontractInvite: vi.fn(async () => ({ sent: true })) }
  const deps = {
    repo: { updateSubcontractState: lockedUpdate(() => store) },
    branches: { findByCode: vi.fn(async () => null) },
    notifier,
  }
  const run = (branchId?: string) =>
    commitSubcontractClaim(ctx, { orderId: "o1", orderCode: "DH1", deliveryWindow: null, shopSettings: {}, branchId, now }, deps as never)
  return { run, notifier, state: () => current }
}

/** Tự chốt khi hết hạn huỷ nhận + chi nhánh bấm chốt — PO 22/10/2026 "bật cả hai". */
describe("chốt đơn gia công", () => {
  it("hết hạn huỷ nhận: hệ thống chốt một lần, gửi tin bắt đầu làm một lần", async () => {
    const t = setup({})
    expect(await t.run()).toBe("COMMITTED")
    expect(t.state().dispatchStatus).toBe("COMMITTED")
    expect(t.state().remindersSent?.M1_PREP).toBe(now.toISOString())
    expect(await t.run()).toBe("NOT_DUE")
    expect(t.notifier.sendSubcontractInvite).toHaveBeenCalledTimes(1)
  })

  it("còn trong hạn huỷ nhận hoặc không còn chi nhánh giữ đơn: hệ thống không chốt", async () => {
    expect(await setup({ graceExpiresAt: new Date(now.getTime() + 60_000).toISOString() }).run()).toBe("NOT_DUE")
    expect(await setup({ dispatchStatus: "OPEN", claimedBranchId: null }).run()).toBe("NOT_DUE")
  })

  it("chi nhánh bấm chốt: chỉ chi nhánh đang giữ đơn; bấm lại không gửi tin lần hai", async () => {
    const t = setup({ graceExpiresAt: new Date(now.getTime() + 60_000).toISOString() })
    await expect(t.run("CN2")).rejects.toThrow(/chưa tiếp nhận/)
    expect(await t.run("CN1")).toBe("COMMITTED")
    expect(await t.run("CN1")).toBe("ALREADY_COMMITTED")
    expect(t.notifier.sendSubcontractInvite).toHaveBeenCalledTimes(1)
  })
})
