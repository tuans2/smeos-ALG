import { describe, expect, it } from "vitest"
import type { SubcontractOrderState } from "@/modules/greeting-card/domain/subcontract-order"
import { fulfilmentProgress, plainDispatchText, type SubcontractCardPayload } from "../domain/subcontract-card"
import { buildSubcontractCardView, type SubcontractCardFacts } from "./subcontract-card-views"

const NOW = new Date("2026-11-09T10:00:00Z")
const payload: SubcontractCardPayload = { kind: "SUBCONTRACT", orderCode: "DH-1", branchCode: "DT-HN-01", title: "Đơn gia công #DH-1" }
const state = (over: Partial<SubcontractOrderState>): SubcontractOrderState =>
  ({ orderId: "o1", orderCode: "DH-1", dispatchStatus: "OPEN", currentRound: 1, claimedBranchId: null, claimedAt: null, graceExpiresAt: null, declinedBranchIds: [], invitedBranchIds: ["DT-HN-01"], roundExpiresAt: "2026-11-09T10:30:00Z", ...over }) as SubcontractOrderState
const facts = (over: Partial<SubcontractCardFacts> = {}): SubcontractCardFacts => ({
  orderStatus: "CONFIRMED", productionStatus: "WAITING", deliveryStatus: "PENDING", state: state({}), branchPartnerOrgId: "partner-org", hasShare: true, ...over,
})
const sign = () => "https://alg.test/subcontract/DH-1?branch=DT-HN-01&t=ky"
const ctx = (viewerOrg = "partner-org", canFulfil = true) => ({ chainOrgId: "chain-org", viewer: { organizationId: viewerOrg, canFulfil }, sign, now: NOW })

describe("thẻ đơn gia công phản chiếu trạng thái thật", () => {
  it("đang mời: cửa hàng được mời có nút mở Thẻ Gia Công; chuỗi, cửa hàng khác, người thiếu quyền thì không", () => {
    expect(buildSubcontractCardView(payload, facts(), ctx())).toMatchObject({ stage: "INVITED", deadlineAt: "2026-11-09T10:30:00Z", actionUrl: sign() })
    expect(buildSubcontractCardView(payload, facts(), ctx("chain-org")).actionUrl).toBeNull()
    expect(buildSubcontractCardView(payload, facts(), ctx("other-org")).actionUrl).toBeNull()
    expect(buildSubcontractCardView(payload, facts(), ctx("partner-org", false)).actionUrl).toBeNull()
    expect(buildSubcontractCardView(payload, facts({ hasShare: false }), ctx()).actionUrl).toBeNull()
  })

  it("nơi khác đã nhận → đóng, lý do 'đã có nơi nhận'; hết hạn vòng → đóng", () => {
    expect(buildSubcontractCardView(payload, facts({ state: state({ dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "CN-2" }) }), ctx())).toMatchObject({ stage: "CLOSED", closedReason: "TAKEN", actionUrl: null })
    expect(buildSubcontractCardView(payload, facts({ state: state({ roundExpiresAt: "2026-11-09T09:00:00Z" }) }), ctx())).toMatchObject({ stage: "CLOSED", closedReason: "EXPIRED" })
  })

  it("cửa hàng này nhận → còn hạn huỷ; chốt → đang làm; giao xong / huỷ đơn → đóng", () => {
    expect(buildSubcontractCardView(payload, facts({ state: state({ dispatchStatus: "CLAIMED_GRACE", claimedBranchId: "DT-HN-01", graceExpiresAt: "2026-11-09T10:05:00Z" }) }), ctx())).toMatchObject({ stage: "GRACE", deadlineAt: "2026-11-09T10:05:00Z" })
    const committed = state({ dispatchStatus: "COMMITTED", claimedBranchId: "DT-HN-01" })
    expect(buildSubcontractCardView(payload, facts({ state: committed, productionStatus: "READY" }), ctx())).toMatchObject({ stage: "IN_PROGRESS", actionUrl: sign() })
    expect(buildSubcontractCardView(payload, facts({ state: committed, deliveryStatus: "DELIVERED" }), ctx())).toMatchObject({ stage: "CLOSED", closedReason: "DONE", actionUrl: null })
    expect(buildSubcontractCardView(payload, facts({ orderStatus: "CANCELLED" }), ctx())).toMatchObject({ stage: "CLOSED", closedReason: "CANCELLED" })
    expect(buildSubcontractCardView(payload, undefined, ctx())).toMatchObject({ stage: "CLOSED", actionUrl: null })
  })

  it("tiến độ 3 bước theo trạng thái đơn, cùng thứ tự với Thẻ Gia Công", () => {
    expect(fulfilmentProgress({ productionStatus: "ARRANGING", deliveryStatus: "PENDING" })).toEqual({ done: [], next: "FINISHED_PHOTO" })
    expect(fulfilmentProgress({ productionStatus: "READY", deliveryStatus: "DELIVERING" })).toEqual({ done: ["FINISHED_PHOTO", "SHIPPER"], next: "DELIVERY_PROOF" })
    expect(fulfilmentProgress({ productionStatus: "READY", deliveryStatus: "DELIVERED" }).next).toBeNull()
  })

  it("chữ tin Telegram → chữ thuần, bỏ link ký", () => {
    expect(plainDispatchText("<b>Đơn #1</b>\nGiao &amp; nhận: https://x.test/subcontract/1?t=abc\nHạn 30 phút")).toBe("Đơn #1\nGiao & nhận:\nHạn 30 phút")
  })

  it("thẻ ghép từ mảnh không lọt qua bước bỏ thẻ", () => {
    expect(plainDispatchText("<<b>script<b>>alert(1)")).not.toContain("<")
  })
})
