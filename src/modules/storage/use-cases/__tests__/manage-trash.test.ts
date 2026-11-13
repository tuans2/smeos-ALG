import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { ITrashRepository } from "../../domain/repositories/trash-repository.interface"
import type { ILibraryTrashRepository } from "../../domain/repositories/library-trash-repository.interface"
import type { TrashItem } from "../../domain/trash-types"
import {
  getTrashList,
  moveToTrash,
  restoreFromTrash,
  permanentDelete,
} from "../manage-trash"

function createMockContext(capabilities: string[] = ["G3"]): TenantContext {
  return {
    organizationId: "org_test",
    userId: "usr_executive",
    roles: ["dieu_hanh"],
    capabilities: new Set(capabilities),
  } as unknown as TenantContext
}

function createMockRepo(overrides: Partial<ITrashRepository> = {}): ITrashRepository {
  return {
    listTrash: vi.fn().mockResolvedValue([]),
    moveToTrash: vi.fn().mockResolvedValue(true),
    restoreFromTrash: vi.fn().mockResolvedValue(true),
    permanentDelete: vi.fn().mockResolvedValue("deleted"),
    findTargetAssetId: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

function createMockLibrary(overrides: Partial<ILibraryTrashRepository> = {}): ILibraryTrashRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    move: vi.fn().mockResolvedValue(true),
    restore: vi.fn().mockResolvedValue(true),
    findUsages: vi.fn().mockResolvedValue([]),
    permanentDelete: vi.fn().mockResolvedValue("deleted"),
    ...overrides,
  }
}

describe("Thùng rác Kho dữ liệu — video, nội dung, catalog, thẻ chào, landing (L-4)", () => {
  const ctx = createMockContext(["G3"])
  const noAssetUsages = vi.fn().mockResolvedValue([])

  it("chuyển vào/khôi phục/xoá vĩnh viễn đi qua kho thùng rác thư viện, không qua kho ảnh", async () => {
    const repo = createMockRepo()
    const library = createMockLibrary()
    await moveToTrash(ctx, { id: "v1", type: "VIDEO" }, repo, noAssetUsages, library)
    await restoreFromTrash(ctx, { id: "v1", type: "VIDEO" }, repo, library)
    await permanentDelete(ctx, { id: "v1", type: "VIDEO" }, repo, noAssetUsages, library)
    expect(library.move).toHaveBeenCalledWith(ctx, "VIDEO", "v1")
    expect(library.restore).toHaveBeenCalledWith(ctx, "VIDEO", "v1")
    expect(library.permanentDelete).toHaveBeenCalledWith(ctx, "VIDEO", "v1", "trash.permanent_delete")
    expect(repo.moveToTrash).not.toHaveBeenCalled()
    expect(repo.permanentDelete).not.toHaveBeenCalled()
  })

  it("mục đang dùng trong chiến dịch thì 409 với chủ ngữ đúng loại, không đụng dữ liệu", async () => {
    const library = createMockLibrary({ findUsages: vi.fn().mockResolvedValue(["campaign"]) })
    await expect(moveToTrash(ctx, { id: "v1", type: "VIDEO" }, createMockRepo(), noAssetUsages, library)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("Video đang được dùng làm gói chiến dịch"),
    })
    await expect(permanentDelete(ctx, { id: "v1", type: "VIDEO" }, createMockRepo(), noAssetUsages, library)).rejects.toMatchObject({ status: 409 })
    expect(library.move).not.toHaveBeenCalled()
    expect(library.permanentDelete).not.toHaveBeenCalled()
  })

  it("legal hold → 409; không thấy → 404; không phải Điều hành → từ chối", async () => {
    const hold = createMockLibrary({ permanentDelete: vi.fn().mockResolvedValue("legal_hold") })
    await expect(permanentDelete(ctx, { id: "c1", type: "CATALOG" }, createMockRepo(), noAssetUsages, hold)).rejects.toMatchObject({ status: 409 })
    const missing = createMockLibrary({ move: vi.fn().mockResolvedValue(false) })
    await expect(moveToTrash(ctx, { id: "x", type: "LANDING" }, createMockRepo(), noAssetUsages, missing)).rejects.toMatchObject({ status: 404 })
    await expect(
      moveToTrash(createMockContext(["X"]), { id: "x", type: "CONTENT" }, createMockRepo(), noAssetUsages, createMockLibrary())
    ).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
  })

  it("danh sách thùng rác gộp cả hai nguồn, mới nhất trước", async () => {
    const at = (d: string) => ({ trashedAt: d, expiresAt: d, daysRemaining: 1, name: "x" })
    const repo = createMockRepo({ listTrash: vi.fn().mockResolvedValue([{ id: "a", type: "RAW_ASSET", ...at("2026-11-01T00:00:00Z") }]) })
    const library = createMockLibrary({ list: vi.fn().mockResolvedValue([{ id: "g", type: "GREETING_CATALOG", ...at("2026-11-03T00:00:00Z") }]) })
    expect((await getTrashList(ctx, repo, library)).map((i) => i.id)).toEqual(["g", "a"])
  })
})

describe("Storage Use-Cases with ITrashRepository Port", () => {
  describe("Phân quyền vai trò Điều hành (requireExecutiveRole)", () => {
    it("ném lỗi CAPABILITY_DENIED nếu tài khoản không có quyền điều hành", async () => {
      const nonExecCtx = createMockContext(["SOME_OTHER_CAP"])
      const repo = createMockRepo()

      await expect(getTrashList(nonExecCtx, repo)).rejects.toThrow(
        "Chỉ tài khoản có vai trò Điều hành mới có quyền quản lý xóa/khôi phục thùng rác"
      )
    })
  })

  describe("getTrashList", () => {
    it("trả về danh sách thùng rác thành công cho vai trò điều hành", async () => {
      const ctx = createMockContext(["G3"])
      const mockItems: TrashItem[] = [
        {
          id: "item_1",
          type: "RAW_ASSET",
          name: "Ảnh mẫu A",
          trashedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          daysRemaining: 1,
        },
      ]
      const repo = createMockRepo({
        listTrash: vi.fn().mockResolvedValue(mockItems),
      })

      const result = await getTrashList(ctx, repo, createMockLibrary())
      expect(result).toHaveLength(1)
      expect(result[0]?.id).toBe("item_1")
      expect(repo.listTrash).toHaveBeenCalledWith(ctx)
    })
  })

  describe("moveToTrash", () => {
    it("di chuyển đối tượng vào thùng rác thành công", async () => {
      const ctx = createMockContext(["L4"])
      const repo = createMockRepo({
        moveToTrash: vi.fn().mockResolvedValue(true),
      })

      await expect(
        moveToTrash(ctx, { id: "prod_1", type: "PRODUCT" }, repo)
      ).resolves.toBeUndefined()

      expect(repo.moveToTrash).toHaveBeenCalledWith(ctx, {
        id: "prod_1",
        type: "PRODUCT",
        userId: "usr_executive",
      })
    })

    it("ném lỗi 404 khi không tìm thấy đối tượng cần xóa", async () => {
      const ctx = createMockContext(["L4"])
      const repo = createMockRepo({
        moveToTrash: vi.fn().mockResolvedValue(false),
      })

      await expect(
        moveToTrash(ctx, { id: "prod_nonexistent", type: "PRODUCT" }, repo)
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe("restoreFromTrash", () => {
    it("khôi phục đối tượng từ thùng rác thành công", async () => {
      const ctx = createMockContext(["A3"])
      const repo = createMockRepo({
        restoreFromTrash: vi.fn().mockResolvedValue(true),
      })

      await expect(
        restoreFromTrash(ctx, { id: "asset_1", type: "RAW_ASSET" }, repo)
      ).resolves.toBeUndefined()

      expect(repo.restoreFromTrash).toHaveBeenCalledWith(ctx, {
        id: "asset_1",
        type: "RAW_ASSET",
      })
    })

    it("ném lỗi 404 khi khôi phục thất bại", async () => {
      const ctx = createMockContext(["A3"])
      const repo = createMockRepo({
        restoreFromTrash: vi.fn().mockResolvedValue(false),
      })

      await expect(
        restoreFromTrash(ctx, { id: "asset_nonexistent", type: "RAW_ASSET" }, repo)
      ).rejects.toMatchObject({ status: 404 })
    })
  })

  describe("permanentDelete", () => {
    it("xóa vĩnh viễn đối tượng khỏi thùng rác", async () => {
      const ctx = createMockContext(["B6"])
      const repo = createMockRepo({
        permanentDelete: vi.fn().mockResolvedValue("deleted"),
      })

      await expect(
        permanentDelete(ctx, { id: "asset_1", type: "RAW_ASSET" }, repo)
      ).resolves.toBeUndefined()

      expect(repo.permanentDelete).toHaveBeenCalledWith(ctx, {
        id: "asset_1",
        type: "RAW_ASSET",
      })
    })

    it("ném lỗi 404 khi xóa vĩnh viễn thất bại", async () => {
      const ctx = createMockContext(["B6"])
      const repo = createMockRepo({
        permanentDelete: vi.fn().mockResolvedValue("not_found"),
      })

      await expect(
        permanentDelete(ctx, { id: "asset_nonexistent", type: "RAW_ASSET" }, repo)
      ).rejects.toMatchObject({ status: 404 })
    })

    it("chặn xoá vĩnh viễn khi asset đang legal hold (409)", async () => {
      const ctx = createMockContext(["B6"])
      const repo = createMockRepo({
        permanentDelete: vi.fn().mockResolvedValue("legal_hold"),
      })

      await expect(
        permanentDelete(ctx, { id: "asset_hold", type: "RAW_ASSET" }, repo)
      ).rejects.toMatchObject({ status: 409 })
    })
  })

  describe("ảnh đang được dùng (SDAGF-012)", () => {
    it("không cho chuyển vào thùng rác hay xoá vĩnh viễn ảnh đang là chứng từ thanh toán", async () => {
      const ctx = createMockContext(["B6"])
      const repo = createMockRepo({ findTargetAssetId: vi.fn().mockResolvedValue("asset_1") })
      const usages = vi.fn().mockResolvedValue(["payment_proof"])
      await expect(moveToTrash(ctx, { id: "asset_1", type: "RAW_ASSET" }, repo, usages)).rejects.toMatchObject({ status: 409 })
      await expect(permanentDelete(ctx, { id: "asset_1", type: "RAW_ASSET" }, repo, usages)).rejects.toMatchObject({ status: 409 })
      expect(repo.moveToTrash).not.toHaveBeenCalled()
      expect(repo.permanentDelete).not.toHaveBeenCalled()
    })

    it("ảnh không còn nơi dùng thì vẫn chuyển vào thùng rác bình thường", async () => {
      const repo = createMockRepo({ findTargetAssetId: vi.fn().mockResolvedValue("asset_2") })
      await moveToTrash(createMockContext(["B6"]), { id: "asset_2", type: "RAW_ASSET" }, repo, vi.fn().mockResolvedValue([]))
      expect(repo.moveToTrash).toHaveBeenCalled()
    })
  })
})
