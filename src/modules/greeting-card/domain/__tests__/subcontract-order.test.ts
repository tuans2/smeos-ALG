import { describe, expect, it } from "vitest"
import {
  cancelClaimSubcontractOrder,
  claimSubcontractOrder,
  commitSubcontractOrder,
  formatGraceCountdown,
  getGraceSecondsRemaining,
  isSubcontractClaimable,
  type SubcontractOrderState,
} from "../subcontract-order"

describe("subcontract-order state machine", () => {
  const initialOpenState: SubcontractOrderState = {
    orderId: "order-1",
    orderCode: "DH-001",
    dispatchStatus: "OPEN",
    currentRound: 1,
    claimedBranchId: null,
    claimedBranchName: null,
    claimedAt: null,
    graceExpiresAt: null,
    declinedBranchIds: [],
    invitedBranchIds: ["b1", "b2", "b3"],
    roundExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  }

  it("isSubcontractClaimable trả về true khi đơn OPEN và chưa bị từ chối trước đó", () => {
    expect(isSubcontractClaimable(initialOpenState, "b1")).toBe(true)
    expect(
      isSubcontractClaimable(
        { ...initialOpenState, declinedBranchIds: ["b1"] },
        "b1"
      )
    ).toBe(false)
    expect(
      isSubcontractClaimable(
        { ...initialOpenState, dispatchStatus: "CLAIMED_GRACE" },
        "b2"
      )
    ).toBe(false)
  })

  it("chi nhánh đầu tiên claim thành công và chuyển sang CLAIMED_GRACE", () => {
    const now = new Date("2026-10-19T08:00:00Z")
    const result = claimSubcontractOrder(initialOpenState, "b1", "Chi nhánh Q1", 5, now)

    expect(result.success).toBe(true)
    if (!result.success) return

    expect(result.nextState.dispatchStatus).toBe("CLAIMED_GRACE")
    expect(result.nextState.claimedBranchId).toBe("b1")
    expect(result.nextState.claimedBranchName).toBe("Chi nhánh Q1")
    expect(result.nextState.claimedAt).toBe(now.toISOString())
    expect(result.nextState.graceExpiresAt).toBe(new Date("2026-10-19T08:05:00Z").toISOString())
  })

  it("chi nhánh thứ hai bấm nhận khi đơn đã bị nhận sẽ nhận lỗi ALREADY_CLAIMED", () => {
    const claimedState: SubcontractOrderState = {
      ...initialOpenState,
      dispatchStatus: "CLAIMED_GRACE",
      claimedBranchId: "b1",
    }

    const result = claimSubcontractOrder(claimedState, "b2", "Chi nhánh Q3", 5)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe("ALREADY_CLAIMED")
  })

  it("chi nhánh không có trong lời mời vòng hiện tại nhận lỗi NOT_INVITED", () => {
    const result = claimSubcontractOrder(initialOpenState, "b9", "Chi nhánh lạ", 5)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.reason).toBe("NOT_INVITED")
    expect(isSubcontractClaimable(initialOpenState, "b9")).toBe(false)
  })

  it("state cũ chưa lưu danh sách mời vẫn cho nhận như trước", () => {
    const result = claimSubcontractOrder({ ...initialOpenState, invitedBranchIds: [] }, "b9", "Chi nhánh lạ", 5)
    expect(result.success).toBe(true)
  })

  it("state thiếu danh sách đã từ chối (dữ liệu cũ/nhập tay) vẫn cho nhận, không ném lỗi", () => {
    // metadata JSON có thể thiếu khoá — từng làm CLAIM ở /public/subcontract/{orderCode} trả 500
    const legacy = { ...initialOpenState, declinedBranchIds: undefined } as unknown as SubcontractOrderState
    expect(isSubcontractClaimable(legacy, "b1")).toBe(true)
    const result = claimSubcontractOrder(legacy, "b1", "Chi nhánh 1", 5)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.nextState.claimedBranchId).toBe("b1")
    expect(result.nextState.declinedBranchIds).toEqual([])
    const cancelled = cancelClaimSubcontractOrder({ ...result.nextState, declinedBranchIds: undefined } as unknown as SubcontractOrderState, "b1")
    expect(cancelled.success).toBe(true)
    if (!cancelled.success) return
    expect(cancelled.nextState.declinedBranchIds).toEqual(["b1"])
  })

  it("chi nhánh đã nhận được quyền hủy trong thời hạn Grace Period và đơn quay về OPEN", () => {
    const claimTime = new Date("2026-10-19T08:00:00Z")
    const graceExpiry = new Date("2026-10-19T08:05:00Z")
    const inGraceState: SubcontractOrderState = {
      ...initialOpenState,
      dispatchStatus: "CLAIMED_GRACE",
      claimedBranchId: "b1",
      claimedBranchName: "Chi nhánh Q1",
      claimedAt: claimTime.toISOString(),
      graceExpiresAt: graceExpiry.toISOString(),
    }

    // Hủy lúc 08:02 (còn trong hạn 5 phút)
    const cancelTime = new Date("2026-10-19T08:02:00Z")
    const cancelResult = cancelClaimSubcontractOrder(inGraceState, "b1", cancelTime)

    expect(cancelResult.success).toBe(true)
    if (!cancelResult.success) return

    expect(cancelResult.nextState.dispatchStatus).toBe("OPEN")
    expect(cancelResult.nextState.claimedBranchId).toBeNull()
    expect(cancelResult.nextState.declinedBranchIds).toContain("b1")
  })

  it("từ chối hủy nếu đã quá hạn Grace Period", () => {
    const inGraceState: SubcontractOrderState = {
      ...initialOpenState,
      dispatchStatus: "CLAIMED_GRACE",
      claimedBranchId: "b1",
      graceExpiresAt: new Date("2026-10-19T08:05:00Z").toISOString(),
    }

    // Cố hủy lúc 08:06 (đã quá hạn 5 phút)
    const lateTime = new Date("2026-10-19T08:06:00Z")
    const cancelResult = cancelClaimSubcontractOrder(inGraceState, "b1", lateTime)

    expect(cancelResult.success).toBe(false)
    if (cancelResult.success) return
    expect(cancelResult.reason).toBe("GRACE_EXPIRED")
  })

  it("commitSubcontractOrder chuyển trạng thái sang COMMITTED", () => {
    const inGraceState: SubcontractOrderState = {
      ...initialOpenState,
      dispatchStatus: "CLAIMED_GRACE",
      claimedBranchId: "b1",
    }

    const committed = commitSubcontractOrder(inGraceState)
    expect(committed.dispatchStatus).toBe("COMMITTED")
  })

  it("getGraceSecondsRemaining và formatGraceCountdown tính toán và định dạng chính xác", () => {
    const now = new Date("2026-10-19T08:00:00Z")
    const expiry = new Date("2026-10-19T08:04:59Z").toISOString()

    const remaining = getGraceSecondsRemaining(expiry, now)
    expect(remaining).toBe(299)
    expect(formatGraceCountdown(remaining)).toBe("04:59")

    expect(formatGraceCountdown(0)).toBe("00:00")
  })
})
