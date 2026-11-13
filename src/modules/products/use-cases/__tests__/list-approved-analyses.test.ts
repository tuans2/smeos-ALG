import { beforeEach, describe, expect, it, vi } from "vitest"
import { listApprovedAnalyses } from "../list-approved-analyses"
import type { TenantContext } from "@/core/tenancy"
import { ProductAnalysisRepository, getProductAnalysisRepository } from "@/modules/products/infra/product-analysis-repository"

vi.mock("@/modules/products/infra/product-analysis-repository")

// `list-approved-analyses.ts` cũng dựng `AssetRepository` và `getStorageProvider()` để ký URL
// ảnh — không liên quan tới luật đang test ở đây (phân trang/`next_cursor`), nhưng phải mock
// bằng factory (không dùng automock) vì `storage-provider-factory.ts` có `import "server-only"`
// ở đầu tệp: automock của Vitest vẫn nạp module thật trước khi thay export, nên nó ném lỗi
// "cannot be imported from a Client Component" ngay lúc collect test, trước khi chạy bất kỳ ca
// thử nào — ba ca thử phía dưới không dùng `asset_id` nên không cần hành vi thật của hai mock này.
vi.mock("@/modules/assets/infra/asset-repository", () => {
  const AssetRepository = vi.fn().mockImplementation(function () { return { findById: vi.fn() } })
  return { AssetRepository, getAssetRepository: vi.fn(() => new AssetRepository()) }
})
vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: vi.fn().mockReturnValue({ signedUrl: vi.fn() }),
}))

const ctx: TenantContext = {
  organizationId: "org-1",
  userId: "user-1",
  workspaceId: "ws-1",
  branchId: "br-1",
  capabilities: new Set(["H5"]),
}

describe("listApprovedAnalyses", () => {
  // Use-case lấy repo qua getProductAnalysisRepository(); trả về instance của class đã mock
  // để mockImplementation trong từng ca thử vẫn có hiệu lực.
  beforeEach(() => {
    vi.mocked(getProductAnalysisRepository).mockImplementation(() => new ProductAnalysisRepository())
  })

  it("từ chối limit ngoài khoảng 1..100", async () => {
    await expect(listApprovedAnalyses(ctx, { limit: 0 })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: { limit: "Phải trong khoảng 1..100" },
    })
    await expect(listApprovedAnalyses(ctx, { limit: 101 })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: { limit: "Phải trong khoảng 1..100" },
    })
  })

  it("trả về danh sách và next_cursor khi có nhiều hơn limit", async () => {
    const mockListApproved = vi.fn().mockResolvedValue([
      { id: "ana-1", approval_state: "APPROVED" },
      { id: "ana-2", approval_state: "APPROVED" },
      { id: "ana-3", approval_state: "APPROVED" },
    ])
    vi.mocked(ProductAnalysisRepository).mockImplementation(function () { return {
      listApproved: mockListApproved,
    } as unknown as ProductAnalysisRepository })

    const res = await listApprovedAnalyses(ctx, { limit: 2 })
    expect(mockListApproved).toHaveBeenCalledWith(ctx, { limit: 3, cursor: null })
    expect(res.data).toHaveLength(2)
    expect(res.next_cursor).toBe("ana-2")
  })

  it("trả về next_cursor = null khi ít hơn hoặc bằng limit", async () => {
    const mockListApproved = vi.fn().mockResolvedValue([
      { id: "ana-1", approval_state: "APPROVED" },
    ])
    vi.mocked(ProductAnalysisRepository).mockImplementation(function () { return {
      listApproved: mockListApproved,
    } as unknown as ProductAnalysisRepository })

    const res = await listApprovedAnalyses(ctx, { limit: 2 })
    expect(res.data).toHaveLength(1)
    expect(res.next_cursor).toBeNull()
  })
})
