import { describe, expect, it, vi } from "vitest"

vi.mock("@/core/tenancy/infra/prisma", () => ({ prisma: {} }))

import { canDecideDismissal, dismissalOf } from "@/modules/greeting-card/domain/dismissal-policy"
import { orderDismissible } from "@/modules/greeting-card/infra/dismissal-store"
import { decideDismissal } from "@/modules/greeting-card/use-cases/decide-dismissal"
import { restoreDismissal } from "@/modules/greeting-card/use-cases/restore-dismissal"
import type { TenantContext } from "@/core/tenancy"
import type { OrderRow } from "@/modules/greeting-card/infra/dismissal-store"

const ctx = (caps: string[]): TenantContext => ({ organizationId: "org-1", workspaceId: "w", userId: "u-1", branchId: null, capabilities: new Set(caps) })
const order = (over: Partial<OrderRow> = {}): OrderRow => ({ id: "o-1", status: "DRAFT", paid_vnd: 0, production_status: "WAITING", pricing_rule_ref: null, ...over })

/**
 * Soát 14/10/2026 nhánh Tinh_chinh_cac_tinh_nang: (1) mọi đơn đều có production_status mặc định
 * WAITING nên bản gốc coi mọi đơn là "đang cắm hoa" → không bỏ hiển thị được đơn nào; (2) chỉ cần
 * quyền Xem đơn (R1) là duyệt được/khôi phục được cả đơn huỷ có hoàn tiền; (3) giao diện so tên quyền
 * thay vì mã nên nút duyệt không bao giờ hiện.
 */
describe("bỏ hiển thị đơn — các chốt chặn", () => {
  it("đơn chưa thu tiền, chưa cắm (WAITING) → bỏ hiển thị được", () => {
    expect(orderDismissible(order()).allowed).toBe(true)
  })

  it("đơn đã cắm, đã thu tiền hoặc đã huỷ → không được", () => {
    expect(orderDismissible(order({ production_status: "ARRANGING" })).allowed).toBe(false)
    expect(orderDismissible(order({ paid_vnd: 100_000 })).allowed).toBe(false)
    expect(orderDismissible(order({ status: "CANCELLED" })).allowed).toBe(false)
  })

  it("chỉ Điều hành (R6) duyệt; Điều phối (R4) chỉ đề xuất; kiểm được mảng mã từ /auth/me", () => {
    expect(canDecideDismissal(["R1", "R6"])).toBe(true)
    expect(canDecideDismissal(["R1", "R4"])).toBe(false)
    expect(canDecideDismissal(["R1", "greeting_card.manage"])).toBe(false)
    expect(canDecideDismissal(new Set(["R6"]))).toBe(true)
  })

  it("Sale/Điều phối không có R6 → không duyệt, không khôi phục được (không chạm DB)", async () => {
    const repo = { decide: vi.fn(), restore: vi.fn() }
    await expect(decideDismissal(ctx(["R1", "R4"]), { id: "o-1", type: "ORDER", approve: true }, repo as never)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(restoreDismissal(ctx(["R1", "R4"]), { id: "o-1", type: "ORDER" }, repo as never)).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    expect(repo.decide).not.toHaveBeenCalled()
    expect(repo.restore).not.toHaveBeenCalled()
  })

  it("đọc bản ghi bỏ hiển thị phòng thủ", () => {
    expect(dismissalOf(null)).toBeUndefined()
    expect(dismissalOf({ status: "WHATEVER" })).toBeUndefined()
    expect(dismissalOf({ status: "PENDING", reason: "x", proposedBy: "u", proposedAt: "t" })?.status).toBe("PENDING")
  })
})
