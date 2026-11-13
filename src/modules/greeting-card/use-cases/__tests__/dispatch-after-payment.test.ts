import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { dispatchAfterPaymentConfirmed, type DispatchAfterPaymentDeps } from "../dispatch-after-payment"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "u", branchId: null, capabilities: new Set() }
const chain = (policy: Record<string, unknown> = {}) => ({
  brochure_workflow_policy: { require_coordinator_acceptance: true },
  chain_dispatch_policy: policy,
})

function deps(settings: unknown, over: Partial<DispatchAfterPaymentDeps> = {}): DispatchAfterPaymentDeps {
  return {
    loadShop: vi.fn().mockResolvedValue({ settings, type: "CHAIN" }),
    hasDispatch: vi.fn().mockResolvedValue(false),
    dispatch: vi.fn().mockResolvedValue({ dispatched: true, sentCount: 3 }),
    ...over,
  }
}

describe("chọn cửa hàng sau khi xác nhận đã nhận tiền", () => {
  it("tiệm một cửa hàng → không đi luồng gia công", async () => {
    const d = deps({}, { loadShop: vi.fn().mockResolvedValue({ settings: {}, type: null }) })
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", {}, d)).toEqual({ mode: "NOT_CHAIN" })
    expect(d.dispatch).not.toHaveBeenCalled()
  })

  it("chuỗi, tự động (mặc định) → tự chọn cửa hàng và phát lệnh", async () => {
    const d = deps(chain())
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", {}, d)).toEqual({ mode: "AUTO", dispatched: true, sentCount: 3 })
    expect(d.dispatch).toHaveBeenCalledWith(ctx, "o1")
  })

  it("cài đặt thủ công → Điều phối tự chọn", async () => {
    const d = deps(chain({ enabled: false }))
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", {}, d)).toEqual({ mode: "MANUAL" })
    expect(d.dispatch).not.toHaveBeenCalled()
  })

  it("đang tự động nhưng tick tự chọn cho đơn này → thủ công cho riêng đơn đó", async () => {
    const d = deps(chain())
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", { manualDispatch: true }, d)).toEqual({ mode: "MANUAL" })
    expect(d.dispatch).not.toHaveBeenCalled()
  })

  it("đơn đã có phiên mời → không phát lại (gọi lặp từ SePay / tự duyệt an toàn)", async () => {
    const d = deps(chain(), { hasDispatch: vi.fn().mockResolvedValue(true) })
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", {}, d)).toEqual({ mode: "ALREADY_DISPATCHED" })
    expect(d.dispatch).not.toHaveBeenCalled()
  })

  it("không có chi nhánh phù hợp → tiền vẫn ghi nhận, trả lý do để Điều phối chọn tay", async () => {
    const d = deps(chain(), { dispatch: vi.fn().mockRejectedValue(new Error("Không tìm thấy chi nhánh hợp lệ")) })
    expect(await dispatchAfterPaymentConfirmed(ctx, "o1", {}, d)).toEqual({
      mode: "AUTO", dispatched: false, sentCount: 0, reason: "Không tìm thấy chi nhánh hợp lệ",
    })
  })
})
