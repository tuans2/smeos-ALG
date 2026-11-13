import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import { deleteGreetingCatalog, restoreGreetingCatalog } from "../../use-cases/delete-greeting-catalog"
import { AppError } from "@/core/http/errors"

type Repo = NonNullable<Parameters<typeof deleteGreetingCatalog>[2]>

function makeCtx(userId: string, capabilities: string[] = ["L1", "R2"]): TenantContext {
  return { organizationId: "org-1", workspaceId: "ws-1", userId, branchId: null, capabilities: new Set(capabilities) }
}

function makeRepo(createdBy: string | null, isActive = true) {
  const catalog = createdBy === null ? null : {
    id: "cat-1", code: "bst-tet", name: "BST Tết", type: "STANDARD", created_by: createdBy, is_active: isActive,
  }
  const mock = {
    getCatalogById: vi.fn().mockResolvedValue(catalog),
    setCatalogActiveWithAudit: vi.fn().mockResolvedValue(undefined),
  }
  return { mock, repo: mock as unknown as Repo }
}

describe("deleteGreetingCatalog & restoreGreetingCatalog", () => {
  it("người tạo xoá được catalog của mình — ẩn + audit trong cùng một lời gọi transaction", async () => {
    const { mock, repo } = makeRepo("user-sale-1")
    await expect(deleteGreetingCatalog(makeCtx("user-sale-1"), "cat-1", repo)).resolves.toEqual({ success: true })
    expect(mock.setCatalogActiveWithAudit).toHaveBeenCalledWith(
      expect.anything(), "cat-1", false,
      expect.objectContaining({ action: "greeting_catalog.delete", after: { is_active: false, deleted_by: "user-sale-1" } }),
    )
  })

  it("người khác không có L4 → CAPABILITY_DENIED, không ghi gì", async () => {
    const { mock, repo } = makeRepo("user-sale-1")
    await expect(deleteGreetingCatalog(makeCtx("user-sale-2"), "cat-1", repo)).rejects.toBeInstanceOf(AppError)
    expect(mock.setCatalogActiveWithAudit).not.toHaveBeenCalled()
  })

  it("R6/R10 (huỷ đơn, hoàn tiền) KHÔNG còn đủ để xoá catalog của người khác", async () => {
    const { mock, repo } = makeRepo("user-sale-1")
    await expect(deleteGreetingCatalog(makeCtx("user-x", ["R6", "R10"]), "cat-1", repo)).rejects.toBeInstanceOf(AppError)
    expect(mock.setCatalogActiveWithAudit).not.toHaveBeenCalled()
  })

  it("có L4 (Điều hành) xoá được catalog của người khác", async () => {
    const { mock, repo } = makeRepo("user-sale-1")
    await deleteGreetingCatalog(makeCtx("user-admin", ["L4"]), "cat-1", repo)
    expect(mock.setCatalogActiveWithAudit).toHaveBeenCalledWith(expect.anything(), "cat-1", false, expect.anything())
  })

  it("catalog không có trong tổ chức → 404", async () => {
    const { repo } = makeRepo(null)
    await expect(deleteGreetingCatalog(makeCtx("user-admin", ["L4"]), "cat-1", repo)).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("người tạo khôi phục catalog đã ẩn và ghi audit restore", async () => {
    const { mock, repo } = makeRepo("user-sale-1", false)
    await restoreGreetingCatalog(makeCtx("user-sale-1"), "cat-1", repo)
    expect(mock.setCatalogActiveWithAudit).toHaveBeenCalledWith(
      expect.anything(), "cat-1", true, expect.objectContaining({ action: "greeting_catalog.restore" }),
    )
  })
})
