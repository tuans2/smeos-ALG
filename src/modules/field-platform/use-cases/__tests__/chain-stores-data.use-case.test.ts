import { describe, it, expect, vi } from "vitest"
import { getChainStoresData } from "../get-chain-stores-data"
import { getStoreFolderData } from "../get-store-folder-data"
import { prisma } from "@/core/tenancy/infra/prisma"

describe("Consolidated Chain Stores Data Use-Cases (/du-lieu)", () => {
  it("getChainStoresData returns summaries of organization branches", async () => {
    vi.spyOn(prisma.branches, "findMany").mockResolvedValueOnce([
      {
        id: "branch-01",
        organization_id: "org-test",
        name: "Chi nhánh Hà Nội",
        code: "HN01",
        address: "123 Phố Huế",
        is_active: true,
        created_at: new Date("2026-01-01"),
        _count: { inventory: 5 },
      } as never,
    ])

    const res = await getChainStoresData("org-test")
    expect(res.organizationId).toBe("org-test")
    expect(res.totalStores).toBe(1)
    expect(res.stores[0]?.name).toBe("Chi nhánh Hà Nội")
    expect(res.stores[0]?.readinessPercentage).toBe(100)
  })

  it("getStoreFolderData groups store data into domain folders", async () => {
    vi.spyOn(prisma.branches, "findUnique").mockResolvedValueOnce({
      id: "branch-01",
      organization_id: "org-test",
      name: "Chi nhánh Hà Nội",
      code: "HN01",
      address: "123 Phố Huế",
      organization: {
        business_profile: {
          address: "123 Phố Huế",
          phone: "0912345678",
          tax_code: "010998877",
        },
        brand_profile: {
          logo_asset_id: "logo-123",
        },
      },
      inventory: [
        {
          product: {
            name: "Bó hoa hồng đỏ",
            attributes: { price_vnd: 450000 },
          },
        },
      ],
    } as never)

    const res = await getStoreFolderData("branch-01", "org-test")
    expect(res).not.toBeNull()
    expect(res!.storeName).toBe("Chi nhánh Hà Nội")
    expect(res!.folders.length).toBeGreaterThan(0)
    
    // Check that org_legal folder exists
    const legalFolder = res!.folders.find((f) => f.domainKey === "org_legal")
    expect(legalFolder).toBeDefined()
    expect(legalFolder!.fields.some((f) => f.fieldKey === "core.org.store_name")).toBe(true)
  })
})
