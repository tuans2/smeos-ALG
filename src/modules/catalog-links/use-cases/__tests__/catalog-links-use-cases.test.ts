import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import type { ICatalogLinkRepository, CatalogLinkRecord } from "../../domain/repositories/catalog-link-repository.interface"
import { createCatalogLink } from "../create-catalog-link"
import { getCatalogLinkBySlug } from "../get-catalog-link"
import { listCatalogLinks } from "../list-catalog-links"
import { revokeCatalogLink } from "../revoke-catalog-link"
import { updateCatalogLink } from "../update-catalog-link"

const mockTenant: TenantContext = {
  organizationId: "org_cat_test",
  workspaceId: "ws_cat_test",
  userId: "user_cat_test",
  branchId: null,
  capabilities: new Set(["J1", "J2"]),
}

const mockLink: CatalogLinkRecord = {
  id: "link_123",
  organization_id: "org_cat_test",
  slug: "bo-suu-tap-tet",
  name: "Bộ Sưu Tập Tết",
  description: "Các sản phẩm Tết đặc sắc",
  filters: { category: "TET" },
  is_revoked: false,
  revoked_at: null,
  revoked_by: null,
  created_by: "user_cat_test",
  created_at: new Date("2026-10-25T10:00:00Z"),
  updated_at: new Date("2026-10-25T10:00:00Z"),
}

function createMockCatalogRepo(overrides?: Partial<ICatalogLinkRepository>): ICatalogLinkRepository {
  return {
    findBySlug: vi.fn().mockResolvedValue(null),
    findBySlugInOrg: vi.fn().mockResolvedValue(mockLink),
    create: vi.fn().mockResolvedValue(mockLink),
    list: vi.fn().mockResolvedValue([mockLink]),
    update: vi.fn().mockResolvedValue(mockLink),
    revoke: vi.fn().mockResolvedValue(true),
    getPublicCatalogRaw: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe("Catalog Links Use-Cases with ICatalogLinkRepository Port", () => {
  describe("createCatalogLink", () => {
    it("tạo link mới thành công khi slug hợp lệ", async () => {
      const repo = createMockCatalogRepo()
      const result = await createCatalogLink(
        mockTenant,
        { slug: "bo-suu-tap-tet", name: "Bộ Sưu Tập Tết" },
        repo
      )

      expect(repo.findBySlug).toHaveBeenCalledWith("bo-suu-tap-tet")
      expect(repo.create).toHaveBeenCalledWith(
        mockTenant,
        expect.objectContaining({
          slug: "bo-suu-tap-tet",
          name: "Bộ Sưu Tập Tết",
        })
      )
      expect(result.id).toBe("link_123")
    })

    it("báo lỗi nếu slug đã được sử dụng", async () => {
      const repo = createMockCatalogRepo({
        findBySlug: vi.fn().mockResolvedValue(mockLink),
      })

      await expect(
        createCatalogLink(mockTenant, { slug: "bo-suu-tap-tet", name: "Trùng" }, repo)
      ).rejects.toThrow(/không hợp lệ/)
    })

    it("slug tự sinh: dừng sau số lần thử có giới hạn thay vì lặp mãi (AUD-021)", async () => {
      const repo = createMockCatalogRepo({
        findBySlug: vi.fn().mockResolvedValue(mockLink),
      })

      await expect(createCatalogLink(mockTenant, { name: "Luôn trùng" }, repo)).rejects.toThrow(/không hợp lệ/)
      expect(vi.mocked(repo.findBySlug).mock.calls.length).toBeLessThanOrEqual(6)
      expect(repo.create).not.toHaveBeenCalled()
    })
  })

  describe("getCatalogLinkBySlug", () => {
    it("lấy thông tin link công khai theo slug", async () => {
      const repo = createMockCatalogRepo({
        findBySlug: vi.fn().mockResolvedValue(mockLink),
      })
      const result = await getCatalogLinkBySlug("bo-suu-tap-tet", repo)

      expect(repo.findBySlug).toHaveBeenCalledWith("bo-suu-tap-tet")
      expect(result?.slug).toBe("bo-suu-tap-tet")
      expect(result?.is_revoked).toBe(false)
    })

    it("trả về null nếu link bị thu hồi", async () => {
      const repo = createMockCatalogRepo({
        findBySlug: vi.fn().mockResolvedValue({ ...mockLink, is_revoked: true }),
      })
      const result = await getCatalogLinkBySlug("bo-suu-tap-tet", repo)
      expect(result).toBeNull()
    })
  })

  describe("listCatalogLinks", () => {
    it("danh sách link trong tenant", async () => {
      const repo = createMockCatalogRepo()
      const results = await listCatalogLinks(mockTenant, {}, repo)

      expect(repo.list).toHaveBeenCalledWith(mockTenant, {})
      expect(results).toHaveLength(1)
      expect(results[0]?.name).toBe("Bộ Sưu Tập Tết")
    })
  })

  describe("revokeCatalogLink", () => {
    it("thu hồi liên kết thành công", async () => {
      const repo = createMockCatalogRepo()
      const result = await revokeCatalogLink(mockTenant, "bo-suu-tap-tet", repo)

      expect(repo.findBySlugInOrg).toHaveBeenCalledWith(mockTenant, "bo-suu-tap-tet")
      expect(repo.revoke).toHaveBeenCalledWith(mockTenant, "bo-suu-tap-tet", mockTenant.userId)
      expect(result).toBe(true)
    })
  })

  describe("updateCatalogLink", () => {
    it("cập nhật thông tin liên kết", async () => {
      const repo = createMockCatalogRepo()
      const result = await updateCatalogLink(
        mockTenant,
        "bo-suu-tap-tet",
        { name: "Bộ Sưu Tập Tết 2027" },
        repo
      )

      expect(repo.update).toHaveBeenCalledWith(
        mockTenant,
        "bo-suu-tap-tet",
        expect.objectContaining({ name: "Bộ Sưu Tập Tết 2027" })
      )
      expect(result.id).toBe("link_123")
    })
  })
})
