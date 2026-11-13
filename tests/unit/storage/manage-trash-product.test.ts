import { describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { moveToTrash } from "@/modules/storage/use-cases/manage-trash"
import type { TrashRepository } from "@/modules/storage/infra/trash-repository"

// Kho thật mở kết nối Prisma lúc nạp — test này chỉ cần luật quyền.
vi.mock("@/modules/storage/infra/trash-repository", () => ({ TrashRepository: class {} }))

const ctx = (codes: string[]): TenantContext => ({
  organizationId: "org",
  workspaceId: "ws",
  userId: "u",
  branchId: null,
  capabilities: new Set(codes),
})

const repo = () => ({ moveToTrash: vi.fn().mockResolvedValue(true), findTargetAssetId: vi.fn().mockResolvedValue(null) }) as unknown as TrashRepository

describe("thùng rác — sản phẩm cần L4", () => {
  it("B6 (không có trần cứng) không đủ để xoá sản phẩm", async () => {
    await expect(moveToTrash(ctx(["B6"]), { id: "p", type: "PRODUCT" }, repo())).rejects.toThrow()
  })

  it("Điều hành có L4 xoá được sản phẩm", async () => {
    const r = repo()
    await moveToTrash(ctx(["L4"]), { id: "p", type: "PRODUCT" }, r)
    expect(r.moveToTrash).toHaveBeenCalled()
  })

  it("ảnh gốc vẫn theo quy tắc cũ", async () => {
    const r = repo()
    await moveToTrash(ctx(["B6"]), { id: "a", type: "RAW_ASSET" }, r)
    expect(r.moveToTrash).toHaveBeenCalled()
  })
})
