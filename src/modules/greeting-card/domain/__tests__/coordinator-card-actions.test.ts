import { describe, it, expect } from "vitest"
import { coordinatorActionBlocker, type CoordinatorAction } from "../brochure-commerce-rules"
import { noActionReason, visibleCoordinatorActions } from "../coordinator-card-actions"

const state = (productionStatus: string, deliveryStatus = "PENDING", status = "CONFIRMED") => ({ status, productionStatus, deliveryStatus })
const shown = (s: ReturnType<typeof state>, extra?: (a: CoordinatorAction) => string | null) =>
  visibleCoordinatorActions((a) => coordinatorActionBlocker(a, s) ?? extra?.(a) ?? null, s).map((v) => (v.blocker ? `${v.action}(mờ)` : v.action))

/** Thẻ đơn tab Điều phối chỉ hiện việc của bước hiện tại (PO 16/10/2026). */
describe("visibleCoordinatorActions", () => {
  it("chờ cắm / đang cắm: phân công thợ, chụp thành phẩm — không hiện giao ship, ảnh người nhận, giao hỏng", () => {
    expect(shown(state("WAITING"))).toEqual(["assign-florist", "product-photo"])
    expect(shown(state("ARRANGING"))).toEqual(["assign-florist", "product-photo"])
  })

  it("hoa đã xong: chụp lại ảnh + giao ship; còn chờ (thanh toán lần 2, duyệt ảnh) thì giao ship hiện mờ kèm lý do", () => {
    expect(shown(state("READY"))).toEqual(["product-photo", "dispatch-shipping"])
    expect(shown(state("READY"), (a) => (a === "dispatch-shipping" ? "Chờ thanh toán lần 2" : null))).toEqual(["product-photo", "dispatch-shipping(mờ)"])
  })

  it("đang giao: chỉ ảnh người nhận và giao không thành công; đơn xong/huỷ: không còn nút", () => {
    expect(shown(state("READY", "DELIVERING"))).toEqual(["recipient-photo", "delivery-failed"])
    expect(shown(state("READY", "DELIVERED", "COMPLETED"))).toEqual([])
    expect(shown(state("WAITING", "PENDING", "CANCELLED"))).toEqual([])
  })

  it("không còn nút nào: nêu lý do của bước (vd. tiệm yêu cầu thu tiền trước khi cắm)", () => {
    const s = state("WAITING", "PENDING", "DRAFT")
    const gate = (a: CoordinatorAction) => coordinatorActionBlocker(a, s) ?? (a === "assign-florist" || a === "product-photo" ? "Tiệm yêu cầu thu cọc/thanh toán trước khi cắm hoa" : null)
    expect(visibleCoordinatorActions(gate, s).map((v) => v.action)).toEqual([])
    expect(noActionReason(gate)).toBe("Tiệm yêu cầu thu cọc/thanh toán trước khi cắm hoa")
  })
})
