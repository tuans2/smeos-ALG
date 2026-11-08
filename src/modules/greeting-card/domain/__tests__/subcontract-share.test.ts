import { describe, expect, it } from "vitest"

import { isShareActive, SHARE_AFTER_CLOSE_DAYS } from "@/modules/orders/domain/order-share"

import type { SubcontractOrderState } from "../subcontract-order"
import { SUBCONTRACT_AREA_FALLBACK, subcontractAreaText, subcontractShares } from "../subcontract-share"

const base: SubcontractOrderState = {
  orderId: "o1", orderCode: "DH1", dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null,
  graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: [], roundExpiresAt: null,
}
const DAY = 86_400_000

/** ADR-014 P-4 (PO 07/11/2026): quyền xem đơn của chi nhánh gia công, hạn 7 ngày sau khi đơn đóng, tin mời chỉ ghi khu vực. */
describe("quyền xem đơn gia công", () => {
  it("phiên mở: chi nhánh được mời vòng này (trừ đã từ chối); có chi nhánh giữ/chốt: chỉ chi nhánh đó; còn lại: không ai", () => {
    expect([...subcontractShares({ ...base, invitedBranchIds: ["A", "B"], declinedBranchIds: ["B"] })]).toEqual([["A", "INVITED"]])
    expect([...subcontractShares({ ...base, dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "B", invitedBranchIds: ["A", "B"] })]).toEqual([["B", "ASSIGNED"]])
    expect([...subcontractShares({ ...base, dispatchStatus: "COMMITTED", claimedBranchId: "A" })]).toEqual([["A", "ASSIGNED"]])
    for (const dispatchStatus of ["ESCALATED", "CANCELLED"] as const) {
      expect(subcontractShares({ ...base, dispatchStatus, invitedBranchIds: ["A"], claimedBranchId: "A" }).size).toBe(0)
    }
    expect(subcontractShares(null).size).toBe(0)
  })

  it("hiệu lực: thu hồi → hết; đơn đóng → được mời hết ngay, đang làm còn đúng 7 ngày", () => {
    const now = new Date("2026-11-20T00:00:00Z")
    const open = { status: "CONFIRMED", deliveryStatus: "PENDING", closedAt: null }
    const closed = (daysAgo: number) => ({ status: "CONFIRMED", deliveryStatus: "DELIVERED", closedAt: new Date(now.getTime() - daysAgo * DAY) })
    expect(isShareActive({ level: "INVITED", revokedAt: null }, open, now)).toBe(true)
    expect(isShareActive({ level: "ASSIGNED", revokedAt: new Date() }, open, now)).toBe(false)
    expect(isShareActive({ level: "INVITED", revokedAt: null }, closed(0), now)).toBe(false)
    expect(isShareActive({ level: "ASSIGNED", revokedAt: null }, closed(SHARE_AFTER_CLOSE_DAYS - 1), now)).toBe(true)
    expect(isShareActive({ level: "ASSIGNED", revokedAt: null }, closed(SHARE_AFTER_CLOSE_DAYS), now)).toBe(false)
    expect(isShareActive({ level: "ASSIGNED", revokedAt: null }, { status: "CANCELLED", deliveryStatus: "PENDING", closedAt: now }, now)).toBe(true)
    expect(isShareActive(null, open, now)).toBe(false)
  })

  it("tin mời chỉ ghi phường/quận/tỉnh; thiếu khu vực → nhắc xem trong Thẻ Gia Công", () => {
    expect(subcontractAreaText({ ward: "Bến Nghé", district: " Quận 1 ", province: "TP. Hồ Chí Minh" })).toBe("Bến Nghé, Quận 1, TP. Hồ Chí Minh")
    expect(subcontractAreaText({ ward: "Tân Định" })).toBe("Tân Định")
    expect(subcontractAreaText(null)).toBe(SUBCONTRACT_AREA_FALLBACK)
  })
})
