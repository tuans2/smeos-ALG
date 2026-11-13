import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { IProductRepository, ProductEntity } from "../../domain/repositories/product-repository.interface"
import { createProduct } from "../create-product"
import { getProduct } from "../get-product"
import { updateProduct } from "../update-product"
import { saveRevision } from "../product-revisions"

// Ghi lịch sử phiên bản đi qua repository riêng (DB) — unit test chỉ kiểm có gọi hay không.
vi.mock("../product-revisions", () => ({ saveRevision: vi.fn().mockResolvedValue(undefined) }))

const mockTenant: TenantContext = {
  organizationId: "org-1",
  branchId: "branch-1",
  userId: "user-1",
  workspaceId: "ws-1",
  capabilities: new Set(["L1", "L2", "L3", "L5"]),
}

function createMockProductRepo(): IProductRepository {
  const products: ProductEntity[] = [
    {
      id: "prod-1",
      organization_id: "org-1",
      branch_id: "branch-1",
      code: "HOA-001",
      name: "Sản phẩm hồng đỏ",
      category: "Sản phẩm",
      shape: "Tròn",
      facing: "Một mặt",
      container: "Giấy gói",
      status: "READY",
      attributes: { price: 350000 },
      availability_config: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]

  return {
    findById: vi.fn(async (_ctx, id) => products.find((p) => p.id === id) ?? null),
    findByCode: vi.fn(async (_ctx, code) => products.find((p) => p.code === code) ?? null),
    listExistingCodes: vi.fn(async (_ctx, codes) => new Set(products.filter((p) => codes.includes(p.code)).map((p) => p.code))),
    list: vi.fn(async () => products),
    listWithPreview: vi.fn(async () => products.map((p) => ({ ...p, price_vnd: 350000 }))),
    create: vi.fn(async (_ctx, input) => {
      const p: ProductEntity = {
        id: `prod-${products.length + 1}`,
        organization_id: "org-1",
        code: input.code,
        name: input.name,
        branch_id: input.branchId,
        category: input.category,
        shape: input.shape,
        facing: input.facing,
        container: input.container,
        status: input.status ?? "DRAFT",
        attributes: input.attributes,
        availability_config: null,
        created_at: new Date(),
        updated_at: new Date(),
      }
      products.push(p)
      return p
    }),
    update: vi.fn(async (_ctx, id, input) => {
      const idx = products.findIndex((p) => p.id === id)
      if (idx === -1) return null
      products[idx] = {
        ...products[idx]!,
        ...(input.name ? { name: input.name } : {}),
        ...(input.code ? { code: input.code } : {}),
      }
      return products[idx]!
    }),
    updateIdentity: vi.fn(async (_ctx, id, input) => {
      const idx = products.findIndex((p) => p.id === id)
      if (idx === -1) return null
      products[idx] = { ...products[idx]!, ...input }
      return products[idx]!
    }),
  }
}

describe("Product Use Cases with Clean Repository", () => {
  it("getProduct trả về sản phẩm khi tìm thấy", async () => {
    const mockRepo = createMockProductRepo()
    const result = await getProduct(mockTenant, "prod-1", mockRepo)

    expect(result.id).toBe("prod-1")
    expect(result.code).toBe("HOA-001")
    expect(mockRepo.findById).toHaveBeenCalledWith(mockTenant, "prod-1")
  })

  it("getProduct ném lỗi 404 khi không tìm thấy", async () => {
    const mockRepo = createMockProductRepo()
    await expect(getProduct(mockTenant, "prod-unknown", mockRepo)).rejects.toThrow()
  })

  it("createProduct tạo sản phẩm mới thành công", async () => {
    const mockRepo = createMockProductRepo()
    const created = await createProduct(
      mockTenant,
      {
        code: "HOA-002",
        name: "Lẵng hoa chúc mừng",
      },
      mockRepo
    )

    expect(created.id).toBe("prod-2")
    expect(created.code).toBe("HOA-002")
    expect(mockRepo.create).toHaveBeenCalled()
  })

  it("createProduct ném lỗi 409 khi trùng mã", async () => {
    const mockRepo = createMockProductRepo()
    await expect(
      createProduct(
        mockTenant,
        {
          code: "HOA-001",
          name: "Bó trùng mã",
        },
        mockRepo
      )
    ).rejects.toThrow(/đã tồn tại/)
  })

  it("updateProduct cập nhật sản phẩm thành công", async () => {
    const mockRepo = createMockProductRepo()
    // Mẫu chính thức chỉ Điều hành (H3) sửa được — luật product-proposal
    const executive = { ...mockTenant, capabilities: new Set([...mockTenant.capabilities, "H3"]) }
    const updated = await updateProduct(
      executive,
      "prod-1",
      {
        name: "Sản phẩm hồng đỏ cao cấp",
      },
      mockRepo
    )

    expect(updated.name).toBe("Sản phẩm hồng đỏ cao cấp")
    expect(mockRepo.update).toHaveBeenCalled()
    expect(saveRevision).toHaveBeenCalledWith(executive, expect.objectContaining({ id: "prod-1" }), "EDIT")
  })

  it("getPricingRules trả về cấu hình giá hiệu lực qua IPricingRuleRepository", async () => {
    const { getPricingRules } = await import("../get-pricing-rules")
    const mockPricingRepo = {
      create: vi.fn(),
      currentRows: vi.fn(async () => []),
    }
    const rules = await getPricingRules(mockTenant, null, mockPricingRepo)
    expect(rules).toBeDefined()
    expect(mockPricingRepo.currentRows).toHaveBeenCalledWith(mockTenant)
  })

  it("putPricingRules ghi cấu hình giá mới qua IPricingRuleRepository", async () => {
    const { putPricingRules } = await import("../put-pricing-rules")
    const mockPricingRepo = {
      create: vi.fn(async () => ({
        id: "pr-1",
        organization_id: "org-1",
        branch_id: null,
        key: "optimal_price_ratio",
        value: 0.6,
        effective_from: new Date(),
        created_by: "user-1",
        created_at: new Date(),
      })),
      currentRows: vi.fn(async () => []),
    }
    const mockBranchRepo = {
      findById: vi.fn(async () => null),
      findByCode: vi.fn(async () => null),
      list: vi.fn(async () => []),
      create: vi.fn(),
      update: vi.fn(),
    }
    // Quy tắc toàn tổ chức: người không bị giới hạn theo chi nhánh (Điều hành có F7 — ADR-012 T-5b)
    const orgWide = { ...mockTenant, capabilities: new Set([...mockTenant.capabilities, "L6", "F7"]) }
    const res = await putPricingRules(
      orgWide,
      { key: "optimal_price_ratio", value: 0.6 },
      mockPricingRepo,
      mockBranchRepo
    )
    expect(res).toBeDefined()
    // Người bị giới hạn theo chi nhánh không ghi được quy tắc toàn tổ chức → 404
    await expect(putPricingRules(mockTenant, { key: "optimal_price_ratio", value: 0.6 }, mockPricingRepo, mockBranchRepo)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(mockPricingRepo.create).toHaveBeenCalledTimes(1)
    expect(mockPricingRepo.create).toHaveBeenCalledWith(
      orgWide,
      expect.objectContaining({ key: "optimal_price_ratio", value: 0.6 })
    )
  })
})

