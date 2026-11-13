import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"

const findMany = vi.fn()
vi.mock("@/core/tenancy/infra/prisma", () => ({
  prisma: { products: { findMany: (...a: unknown[]) => findMany(...a) }, assets: { findMany: vi.fn() } },
}))
vi.mock("@/modules/assets/infra/storage-signing", () => ({ signStorageUrl: vi.fn() }))

import { ProductRepository } from "../product-repository"

const ctx: TenantContext = {
  organizationId: "org-1",
  userId: "user-1",
  workspaceId: "ws-1",
  branchId: "br-1",
  capabilities: new Set(["L1"]),
}

// Sản phẩm bị xoá được chuyển vào thùng rác bằng status ARCHIVED — không được hiện lại
// trong danh sách Sản phẩm & Giá nếu người gọi không chủ động lọc theo status.
describe("ProductRepository.listWithPreview — ẩn sản phẩm trong thùng rác", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([])
  })

  it("mặc định loại sản phẩm ARCHIVED", async () => {
    await new ProductRepository().listWithPreview(ctx, {}, { limit: 10, cursor: null })
    expect(findMany.mock.calls[0]?.[0].where).toMatchObject({
      organization_id: "org-1",
      status: { not: "ARCHIVED" },
    })
  })

  it("vẫn cho lọc tường minh status=ARCHIVED", async () => {
    await new ProductRepository().listWithPreview(ctx, { status: "ARCHIVED" }, { limit: 10, cursor: null })
    expect(findMany.mock.calls[0]?.[0].where).toMatchObject({ status: "ARCHIVED" })
  })
})
