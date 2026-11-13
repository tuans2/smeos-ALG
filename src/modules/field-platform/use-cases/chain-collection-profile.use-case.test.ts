import { describe, it, expect, vi } from "vitest"
import { getChainCollectionProfile } from "./get-chain-collection-profile"
import { previewChainCollectionProfile } from "./preview-chain-collection-profile"
import { publishChainCollectionProfile } from "./publish-chain-collection-profile"
import { getStoreCollectionTransparency } from "./get-store-collection-transparency"
import type { IChainCollectionProfileRepository } from "../infra/chain-collection-repository"
import type { ChainCollectionProfile, CollectionRule } from "../domain/chain-collection-profile"

describe("Chain Collection Profile Use-Cases (§9.5.8)", () => {
  let inMemoryProfile: ChainCollectionProfile | null = null

  const mockRepo: IChainCollectionProfileRepository = {
    getProfile: vi.fn(async () => inMemoryProfile),
    saveProfile: vi.fn(async (profile) => {
      inMemoryProfile = profile
    }),
    getStoreDsa: vi.fn(async () => null),
    listActiveDsas: vi.fn(async () => []),
    listBranchesWithInventory: vi.fn(async () => []),
    findBranchBasic: vi.fn(async () => null),
    findBranchWithFullProfiles: vi.fn(async () => null),
    countActiveBranches: vi.fn(async () => 0),
    createPartnerBranch: vi.fn(async () => ({ id: "branch-1", name: "Test Store", code: "TST" })),
  }

  it("getChainCollectionProfile returns default profile when non-existent", async () => {
    const res = await getChainCollectionProfile("org-123", mockRepo)
    expect(res.profile.organizationId).toBe("org-123")
    expect(res.profile.profileVersion).toBe(1)
    expect(res.collectableFields.length).toBeGreaterThan(0)
    expect(res.profile.rules.length).toBe(res.collectableFields.length)
  })

  it("previewChainCollectionProfile validates rules and returns affected store count", async () => {
    const validRules: CollectionRule[] = [
      {
        ruleId: "r1",
        fieldKey: "core.catalog.price_vnd",
        minForm: "AGGREGATED",
        scope: { type: "ALL_STORES" },
        mandatoryForNewStore: true,
        status: "ACTIVE",
      },
    ]

    const preview = await previewChainCollectionProfile("org-123", validRules, mockRepo)
    expect(preview.validation.isValid).toBe(true)
    expect(preview.summary.activeRuleCount).toBe(1)
    expect(preview.riskLevel).toBe("R2_STANDARD_RISK")
  })

  it("publishChainCollectionProfile increments immutable version and saves", async () => {
    const validRules: CollectionRule[] = [
      {
        ruleId: "r1",
        fieldKey: "core.catalog.price_vnd",
        minForm: "RAW",
        scope: { type: "ALL_STORES" },
        mandatoryForNewStore: true,
        status: "ACTIVE",
      },
    ]

    const published = await publishChainCollectionProfile(
      {
        organizationId: "org-123",
        rules: validRules,
        publishedBy: "user-admin",
      },
      mockRepo
    )

    expect(published.profileVersion).toBe(1)
    expect(published.rules.length).toBe(1)
    expect(mockRepo.saveProfile).toHaveBeenCalled()
  })

  it("getStoreCollectionTransparency generates transparency items for a store", async () => {
    vi.mocked(mockRepo.findBranchBasic).mockResolvedValueOnce({ id: "store-001", name: "Chi nhánh 1", organization_id: "org-123" })
    const res = await getStoreCollectionTransparency("store-001", "org-123", mockRepo)
    expect(res?.storeId).toBe("store-001")
    expect(res?.storeName).toBe("Chi nhánh 1")
    expect(res?.items.some((item) => item.fieldKey === "core.catalog.price_vnd")).toBe(true)
  })

  it("getStoreCollectionTransparency: chi nhánh của tổ chức khác hoặc mã lạ → null, không đọc DSA", async () => {
    vi.mocked(mockRepo.getStoreDsa).mockClear()
    vi.mocked(mockRepo.findBranchBasic).mockResolvedValueOnce({ id: "store-b", name: "Chi nhánh của B", organization_id: "org-b" })
    expect(await getStoreCollectionTransparency("store-b", "org-123", mockRepo)).toBeNull()
    vi.mocked(mockRepo.findBranchBasic).mockResolvedValueOnce(null)
    expect(await getStoreCollectionTransparency("khong-co", "org-123", mockRepo)).toBeNull()
    expect(mockRepo.getStoreDsa).not.toHaveBeenCalled()
  })
})
