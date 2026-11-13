import { describe, it, expect, vi } from "vitest"
import { linkMainImage } from "../product-main-image"
import type { DbClient } from "../db-client"
import type { TenantContext } from "@/core/tenancy"

const ctx: TenantContext = { organizationId: "org-a", workspaceId: "w", userId: "u", branchId: null, capabilities: new Set() }

/** ID ảnh đến từ client (sửa sản phẩm, nhập lại Excel): không được gắn ảnh của tổ chức khác. */
describe("linkMainImage", () => {
  it("ảnh không thuộc tổ chức → 404, không tạo liên kết", async () => {
    const db = {
      assets: { findFirst: vi.fn().mockResolvedValue(null), updateMany: vi.fn() },
      product_images: { upsert: vi.fn() },
    } as unknown as DbClient
    await expect(linkMainImage(db, ctx, "p1", "foreign-asset")).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(db.product_images.upsert).not.toHaveBeenCalled()
    expect(db.assets.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organization_id: "org-a" }) }))
  })

  it("ảnh của chính tổ chức → gắn làm ảnh chính", async () => {
    const db = {
      assets: { findFirst: vi.fn().mockResolvedValue({ id: "a1" }), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      product_images: { upsert: vi.fn().mockResolvedValue({}) },
    } as unknown as DbClient
    await linkMainImage(db, ctx, "p1", "a1")
    expect(db.product_images.upsert).toHaveBeenCalled()
  })
})
