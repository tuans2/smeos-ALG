import { describe, expect, it, vi, beforeEach } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { assets } from "@/modules/assets/infra/entities"

const mockTenantContext: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["I2"]),
}

const mockAsset: assets = {
  id: "asset-1",
  organization_id: "org-1",
  product_id: "prod-1",
  parent_asset_id: "master-asset-1",
  kind: "MARKETING",
  state: "READY",
  version: 1,
  storage_key: "org/org-1/prod-1/asset-1.png",
  thumb_key: null,
  mime_type: "image/png",
  width: 1024,
  height: 1024,
  aspect_ratio: "1:1",
  file_size: 1024,
  provider: null,
  model: null,
  model_version: null,
  pipeline_version: null,
  parameters: null,
  prompt: null,
  input_sha256: null,
  output_sha256: "dummy-sha",
  quality_score: null,
  identity_score: null,
  generated_flags: null,
  cost_usd: null,
  metadata: null,
  approval_state: "PENDING",
  approved_by: null,
  approved_at: null,
  created_by: "user-1",
  created_at: new Date(),
  updated_at: new Date(),
  trashed_at: null,
  purge_after: null,
  legal_hold_until: null,
}

const mockFindById = vi.fn()
const mockApprove = vi.fn()

vi.mock("@/modules/assets/infra/asset-repository", () => {
  const mocked = {
    AssetRepository: vi.fn().mockImplementation(function () { return {
      findById: mockFindById,
      approve: mockApprove,
    } }),
  }
  return { ...mocked, getAssetRepository: vi.fn(() => new mocked.AssetRepository()) }
})

vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({
  getStorageProvider: vi.fn().mockImplementation(function () { return {
    name: "gia-lap",
    signedUrl: vi.fn().mockResolvedValue("https://storage.avilotusgroup.com/asset-1.png"),
  } }),
}))

vi.mock("@/modules/audit/use-cases/record-audit-log", () => ({
  recordAuditLog: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/modules/jobs/infra/transaction", () => ({
  runInTransaction: vi.fn().mockImplementation(async (callback) => {
    return callback({})
  }),
}))

import { approveAsset } from "@/modules/assets/use-cases/approve-asset"

describe("approveAsset use-case", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws notFound when asset does not exist", async () => {
    mockFindById.mockResolvedValue(null)

    await expect(approveAsset(mockTenantContext, "non-existent")).rejects.toThrow("Không tìm thấy")
  })

  it("is idempotent when asset is already APPROVED", async () => {
    mockFindById.mockResolvedValue({
      ...mockAsset,
      approval_state: "APPROVED",
      approved_by: "user-old",
      approved_at: new Date(),
    })

    const result = await approveAsset(mockTenantContext, "asset-1")

    expect(result.approval_state).toBe("APPROVED")
    expect(result.url).toBe("https://storage.avilotusgroup.com/asset-1.png")
    expect(mockApprove).not.toHaveBeenCalled()
  })

  it("approves pending asset and returns updated record with signed URL", async () => {
    mockFindById.mockResolvedValue({ ...mockAsset })
    mockApprove.mockResolvedValue({
      ...mockAsset,
      approval_state: "APPROVED",
      approved_by: "user-1",
      approved_at: new Date(),
    })

    const result = await approveAsset(mockTenantContext, "asset-1")

    expect(mockApprove).toHaveBeenCalledWith(mockTenantContext, "asset-1", expect.objectContaining({
      approvedBy: "user-1",
    }))
    expect(result.approval_state).toBe("APPROVED")
    expect(result.url).toBe("https://storage.avilotusgroup.com/asset-1.png")
  })
})
