import { describe, expect, it, vi, beforeEach } from "vitest"
import { AppError } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"

const mockTenantContext: TenantContext = {
  organizationId: "org-1",
  workspaceId: "ws-1",
  userId: "user-1",
  branchId: null,
  capabilities: new Set(["H5"]),
}

vi.mock("@/modules/product-copies/infra/product-copy-repository", () => {
  const mocked = {
    ProductCopyRepository: vi.fn().mockImplementation(function () { return {
      updateEdited: vi.fn(),
    } }),
  }
  return { ...mocked, getProductCopyRepository: vi.fn(() => new mocked.ProductCopyRepository()) }
})

import { updateProductCopy } from "@/modules/product-copies/use-cases/update-product-copy"
import { ProductCopyRepository } from "@/modules/product-copies/infra/product-copy-repository"

describe("updateProductCopy", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("throws VALIDATION_FAILED when edited data is invalid", async () => {
    await expect(
      updateProductCopy(mockTenantContext, "copy-1", { invalid: "data" })
    ).rejects.toThrow(AppError)
  })

  it("calls repo.updateEdited with valid data", async () => {
    const updateEdited = vi.fn().mockResolvedValue({})
    vi.mocked(ProductCopyRepository).mockImplementation(function () { return {
      updateEdited,
    } as unknown as ProductCopyRepository })

    const validEdited = {
      suggested_name: "Updated Name",
      suggested_description: "Updated description",
      suggested_tags: ["tag1", "tag2"],
      suggested_occasions: ["valentine"],
      suggested_price_segment: "premium",
    }

    await updateProductCopy(mockTenantContext, "copy-1", validEdited)

    expect(updateEdited).toHaveBeenCalledWith(mockTenantContext, "copy-1", validEdited)
  })

  it("throws when repo throws NOT_FOUND", async () => {
    const updateEdited = vi.fn().mockRejectedValue(new Error("NOT_FOUND"))
    vi.mocked(ProductCopyRepository).mockImplementation(function () { return {
      updateEdited,
    } as unknown as ProductCopyRepository })

    const validEdited = {
      suggested_name: "Updated Name",
      suggested_description: "Updated description",
      suggested_tags: ["tag1", "tag2"],
      suggested_occasions: ["valentine"],
      suggested_price_segment: "premium",
    }

    await expect(updateProductCopy(mockTenantContext, "copy-1", validEdited)).rejects.toThrow("NOT_FOUND")
  })

  it("throws when repo throws CANNOT_EDIT", async () => {
    const updateEdited = vi.fn().mockRejectedValue(new Error("CANNOT_EDIT"))
    vi.mocked(ProductCopyRepository).mockImplementation(function () { return {
      updateEdited,
    } as unknown as ProductCopyRepository })

    const validEdited = {
      suggested_name: "Updated Name",
      suggested_description: "Updated description",
      suggested_tags: ["tag1", "tag2"],
      suggested_occasions: ["valentine"],
      suggested_price_segment: "premium",
    }

    await expect(updateProductCopy(mockTenantContext, "copy-1", validEdited)).rejects.toThrow("CANNOT_EDIT")
  })

  it("throws VALIDATION_FAILED when edited content contains flower banned phrases", async () => {
    const bannedEdited = {
      suggested_name: "Bó hoa vĩnh cửu không bao giờ tàn",
      suggested_description: "Cam kết xả kho lỗ vốn",
      suggested_tags: ["hoa vĩnh cửu"],
    }

    await expect(
      updateProductCopy(mockTenantContext, "copy-1", bannedEdited)
    ).rejects.toThrow(AppError)
  })
})