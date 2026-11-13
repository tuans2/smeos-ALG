import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { confirmChainPaymentAndDispatch } from "../coordinator-confirm-chain-payment"

const ctx: TenantContext = { organizationId: "org-1", workspaceId: "", userId: "u", branchId: null, capabilities: new Set(["R4"]) }

describe("Điều phối xác nhận đã nhận tiền (Chuỗi)", () => {
  it("chỉ ghi nhận thanh toán, không vào sản xuất; chuyển cờ tự chọn cửa hàng sang bước phát lệnh", async () => {
    const repo = { applyProgress: vi.fn().mockResolvedValue({ success: true }) }
    const dispatch = vi.fn().mockResolvedValue({ mode: "MANUAL" })
    const order = { id: "o1", status: "DRAFT" } as Parameters<typeof confirmChainPaymentAndDispatch>[1]

    const res = await confirmChainPaymentAndDispatch(ctx, order, { manualDispatch: true }, repo, dispatch)

    expect(res).toEqual({ success: true, dispatch: { mode: "MANUAL" } })
    const progress = repo.applyProgress.mock.calls[0]?.[2]
    expect(progress).toEqual({
      eventType: "COORDINATOR_PAYMENT_CONFIRMED",
      orderStatus: "CONFIRMED",
      noteAppend: "[Điều phối xác nhận đã nhận tiền] Đã đối chiếu ảnh chuyển khoản",
    })
    expect(dispatch).toHaveBeenCalledWith(ctx, "o1", { manualDispatch: true })
  })
})
