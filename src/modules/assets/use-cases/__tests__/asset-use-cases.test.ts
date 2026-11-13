import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository, AssetEntity } from "../../domain/repositories/asset-repository.interface"
import { getAsset } from "../get-asset"
import { deleteAsset } from "../delete-asset"
import { listAssets } from "../list-assets"
import type { IProductRepository } from "@/modules/products/domain/repositories/product-repository.interface"

const mockTenant: TenantContext = {
  organizationId: "org-assets-1",
  branchId: null,
  userId: "user-1",
  workspaceId: "ws-1",
  capabilities: new Set(["G1", "G2", "G3"]),
}

const mockAsset: AssetEntity = {
  id: "ast_123",
  organization_id: "org-assets-1",
  product_id: "prod_1",
  parent_asset_id: null,
  kind: "ORIGINAL",
  state: "READY",
  version: 1,
  storage_key: "org/org-assets-1/prod_1/ast_123.jpg",
  thumb_key: null,
  mime_type: "image/jpeg",
  width: 1000,
  height: 1000,
  aspect_ratio: "1:1",
  file_size: 102400,
  provider: null,
  model: null,
  model_version: null,
  pipeline_version: null,
  parameters: null,
  prompt: null,
  input_sha256: null,
  output_sha256: null,
  quality_score: 95,
  identity_score: 95,
  generated_flags: null,
  cost_usd: null,
  metadata: null,
  approval_state: "APPROVED",
  approved_by: "user-1",
  approved_at: new Date(),
  created_by: "user-1",
  created_at: new Date(),
}

function createMockAssetRepo(overrides?: Partial<IAssetRepository>): IAssetRepository {
  return {
    findById: vi.fn().mockResolvedValue(mockAsset),
    findByOrganizationId: vi.fn().mockResolvedValue(mockAsset),
    list: vi.fn().mockResolvedValue([mockAsset]),
    create: vi.fn().mockResolvedValue(mockAsset),
    delete: vi.fn().mockResolvedValue(true),
    findMasterByJobId: vi.fn().mockResolvedValue(null),
    approve: vi.fn().mockResolvedValue(mockAsset),
    findApprovedMaster: vi.fn().mockResolvedValue(mockAsset),
    listByJobId: vi.fn().mockResolvedValue([]),
    listDerivedFrom: vi.fn().mockResolvedValue([]),
    ...overrides,
  }
}

describe("Asset Use-Cases with IAssetRepository Port", () => {
  describe("getAsset", () => {
    it("trả về thông tin asset khi tồn tại", async () => {
      const repo = createMockAssetRepo()
      const result = await getAsset(mockTenant, "ast_123", repo)

      expect(repo.findById).toHaveBeenCalledWith(mockTenant, "ast_123")
      expect(result.id).toBe("ast_123")
    })

    it("ném lỗi 404 khi không tìm thấy", async () => {
      const repo = createMockAssetRepo({
        findById: vi.fn().mockResolvedValue(null),
      })
      await expect(getAsset(mockTenant, "ast_unknown", repo)).rejects.toThrow()
    })
  })

  describe("deleteAsset", () => {
    it("xóa asset: xoá dòng và ghi hàng đợi xoá payload qua một lệnh", async () => {
      const repo = createMockAssetRepo()
      const remove = vi.fn().mockResolvedValue(true)
      await expect(deleteAsset(mockTenant, "ast_123", repo, { remove, organizationHoldUntil: async () => null, usages: async () => [] })).resolves.toBeUndefined()
      expect(remove).toHaveBeenCalledWith(mockTenant, mockAsset, "asset.delete")
    })

    it("ném lỗi 404 khi không thấy asset, không xoá gì", async () => {
      const repo = createMockAssetRepo({ findById: vi.fn().mockResolvedValue(null) })
      const remove = vi.fn()
      await expect(deleteAsset(mockTenant, "ast_unknown", repo, { remove, organizationHoldUntil: async () => null, usages: async () => [] })).rejects.toThrow()
      expect(remove).not.toHaveBeenCalled()
    })

    it("ném lỗi 404 khi xoá thất bại", async () => {
      const repo = createMockAssetRepo()
      await expect(
        deleteAsset(mockTenant, "ast_123", repo, { remove: vi.fn().mockResolvedValue(false), organizationHoldUntil: async () => null, usages: async () => [] })
      ).rejects.toThrow()
    })

    it("chặn xoá khi asset đang legal hold (409), không xoá gì", async () => {
      const now = new Date("2026-10-29T00:00:00Z")
      const repo = createMockAssetRepo({
        findById: vi.fn().mockResolvedValue({ ...mockAsset, legal_hold_until: new Date("2027-01-01T00:00:00Z") }),
      })
      const remove = vi.fn()
      await expect(
        deleteAsset(mockTenant, "ast_123", repo, { remove, organizationHoldUntil: async () => null, usages: async () => [], now })
      ).rejects.toMatchObject({ code: "CONFLICT" })
      expect(remove).not.toHaveBeenCalled()
    })

    it("chặn xoá khi ảnh đang được dùng (chứng từ thanh toán) — 409, không xoá gì", async () => {
      const remove = vi.fn()
      await expect(
        deleteAsset(mockTenant, "ast_123", createMockAssetRepo(), {
          remove,
          organizationHoldUntil: async () => null,
          usages: async () => ["payment_proof"],
        })
      ).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("chứng từ thanh toán") })
      expect(remove).not.toHaveBeenCalled()
    })

    it("chặn xoá khi cả tổ chức đang legal hold (409)", async () => {
      const now = new Date("2026-10-29T00:00:00Z")
      const remove = vi.fn()
      await expect(
        deleteAsset(mockTenant, "ast_123", createMockAssetRepo(), {
          remove,
          organizationHoldUntil: async () => new Date("2027-01-01T00:00:00Z"),
          usages: async () => [],
          now,
        })
      ).rejects.toMatchObject({ code: "CONFLICT" })
      expect(remove).not.toHaveBeenCalled()
    })
  })

  describe("listAssets", () => {
    it("trả về danh sách asset kèm phân trang", async () => {
      const assetRepo = createMockAssetRepo()
      const productRepo: IProductRepository = {
        findById: vi.fn().mockResolvedValue({ id: "prod_1", name: "Sản phẩm A" } as never),
        findByCode: vi.fn().mockResolvedValue(null),
        listExistingCodes: vi.fn().mockResolvedValue(new Set()),
        list: vi.fn().mockResolvedValue([]),
        listWithPreview: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
        updateIdentity: vi.fn(),
      }

      const result = await listAssets(
        mockTenant,
        { limit: 10 },
        assetRepo,
        productRepo
      )

      expect(assetRepo.list).toHaveBeenCalled()
      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.id).toBe("ast_123")
      expect(result.data[0]?.product_name).toBe("Sản phẩm A")
    })
  })
})
