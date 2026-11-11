import { beforeEach, describe, expect, it, vi } from "vitest"

import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy/tenant-context"

const guard = vi.hoisted(() => ({ assertWithinPriceBounds: vi.fn() }))
vi.mock("@/modules/costing/use-cases/price-floor-guard", () => guard)
// Chặn mọi bước sau kiểm giá trước khi chạm CSDL: tra sản phẩm → "không có", trường tự tạo → lỗi mốc
vi.mock("@/modules/coordinator/connectors/master-index-connector", () => ({
  DirectMasterIndexConnector: class { getProductMasterIndex = async () => null },
}))
vi.mock("@/modules/field-platform/use-cases/apply-custom-fields", () => ({
  applyCustomFields: async () => { throw new Error("STOP_AFTER_PRICE_CHECK") },
}))

import { createCoordinatorOrder, type CreateCoordinatorOrderInput } from "@/modules/coordinator/use-cases/create-coordinator-order"

/**
 * Audit BL-20 (11/11/2026): tạo đơn ở Điều phối lấy giá client gửi mà không qua sàn/trần — giá bị chặn ở báo giá,
 * sổ đơn vẫn lọt qua màn Điều phối (PO 07/11/2026, Q3).
 */
const ctx: TenantContext = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", branchId: null, capabilities: new Set(["R2"]) }

const input = (over: Partial<CreateCoordinatorOrderInput> = {}): CreateCoordinatorOrderInput => ({
  productId: "p-1",
  customerName: "Nguyễn Văn An",
  recipientName: "Trần Thị Bình",
  recipientPhone: "0901234567",
  deliveryAddress: { street: "12 Lê Lợi" },
  deliveryTargetTime: "17:00",
  deliveryTargetAt: new Date(Date.now() + 6 * 3600_000).toISOString(),
  productTitle: "Bình gốm",
  unitPriceVnd: 100_000,
  flowers: [],
  ...over,
})

/** Lỗi của lần gọi (hoặc `null` nếu không lỗi) — so mã lỗi, không so cả đối tượng. */
async function failure(promise: Promise<unknown>): Promise<{ code?: unknown; message: string } | null> {
  try {
    await promise
    return null
  } catch (error) {
    return { code: (error as { code?: unknown }).code, message: (error as Error).message }
  }
}

describe("tạo đơn Điều phối — sàn và trần giá", () => {
  beforeEach(() => {
    guard.assertWithinPriceBounds.mockClear()
  })

  it("giá dưới sàn → 422 từ bộ chặn chung, không tạo đơn", async () => {
    guard.assertWithinPriceBounds.mockImplementation(async () => { throw new AppError("UNPROCESSABLE_ENTITY", "Giá thấp hơn giá sàn") })
    expect(await failure(createCoordinatorOrder(ctx, input()))).toEqual({ code: "UNPROCESSABLE_ENTITY", message: "Giá thấp hơn giá sàn" })
    expect(guard.assertWithinPriceBounds).toHaveBeenCalledWith(ctx, [{ productId: "p-1", quantity: 1 }], 100_000, 100_000)
  })

  it("không có sản phẩm hoặc giá 0 (chờ báo giá) → không tra sàn", async () => {
    guard.assertWithinPriceBounds.mockImplementation(async () => { throw new Error("không được gọi") })
    expect((await failure(createCoordinatorOrder(ctx, input({ productId: undefined }))))?.message).toBe("STOP_AFTER_PRICE_CHECK")
    // Có sản phẩm, giá 0 → bỏ qua sàn, dừng ở bước tra sản phẩm (bản giả trả "không có")
    expect((await failure(createCoordinatorOrder(ctx, input({ unitPriceVnd: 0 }))))?.code).toBe("UNPROCESSABLE_ENTITY")
    expect(guard.assertWithinPriceBounds).not.toHaveBeenCalled()
  })
})
