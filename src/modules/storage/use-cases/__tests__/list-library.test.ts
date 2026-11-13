import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy"
import type { LibraryRow } from "../../infra/library-repository"
import { getLibrarySummary, listLibrary, type LibraryDeps } from "../list-library"

const ctx = (capabilities: string[], branchId: string | null = null): TenantContext => ({
  organizationId: "org-a",
  workspaceId: "ws",
  userId: "u",
  branchId,
  capabilities: new Set(capabilities),
})

const row = (over: Partial<LibraryRow>): LibraryRow => ({
  id: "r1",
  type: "ai_image",
  title: "",
  createdAt: new Date("2026-10-01T00:00:00Z"),
  createdBy: "staff-a",
  status: "READY",
  subtype: "MASTER",
  storageKey: "org/org-a/p/r1.jpg",
  mimeType: "image/jpeg",
  ...over,
})

function deps(rows: LibraryRow[]): LibraryDeps {
  return {
    listRows: vi.fn(async () => rows),
    loadCovers: async () => new Map([["c1", { storageKey: "org/org-a/p/cover.jpg" }], ["c2", { driveLink: "https://drive.google.com/file/d/x/view" }]]),
    loadDirectory: async () => ({
      isChain: true,
      branchOfUser: new Map([["staff-a", "branch-a"], ["owner", null]]),
      branchNames: new Map([["branch-a", "Chi nhánh Quận 1"]]),
    }),
    signUrl: async (key) => `/signed/${key}`,
  }
}

describe("listLibrary", () => {
  it("gắn nhãn chi nhánh theo người tạo và ảnh xem trước ký có hạn", async () => {
    const result = await listLibrary(ctx(["G1"]), { type: "ai_image", scope: "all", q: null, from: null, cursor: null }, deps([row({})]))
    expect(result.items[0]).toMatchObject({
      branch: { id: "branch-a", name: "Chi nhánh Quận 1" },
      thumbnail_url: "/signed/org/org-a/p/r1.jpg",
      open_href: "/creative-studio?area=d&assetId=r1",
      asset_type: { code: "1", name: "Ảnh bìa sản phẩm", module: "content" },
    })
    expect(result.next_cursor).toBeNull()
  })

  it("ưu tiên asset_type_code từ metadata nếu có", async () => {
    const bannerRow = row({
      id: "b1",
      type: "ai_image",
      title: "Poster khuyến mãi lớn",
      subtype: "MARKETING",
      metadata: { asset_type_code: "9" },
    })
    const result = await listLibrary(ctx(["G1"]), { type: "ai_image", scope: "all", q: null, from: null, cursor: null }, deps([bannerRow]))
    expect(result.items[0]?.asset_type).toEqual({
      code: "9",
      name: "Áp phích ưu đãi",
      module: "promotion",
    })
    expect(result.items[0]?.title).toBe("Poster khuyến mãi lớn")
  })

  it("thiếu quyền đọc của công cụ gốc → từ chối; loại lạ → 400; chi nhánh không thuộc tổ chức → 404", async () => {
    const input = { scope: "all" as const, q: null, from: null, cursor: null }
    await expect(listLibrary(ctx(["G1"]), { ...input, type: "video" }, deps([]))).rejects.toMatchObject({ code: "CAPABILITY_DENIED" })
    await expect(listLibrary(ctx(["G1"]), { ...input, type: "x" }, deps([]))).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
    await expect(
      listLibrary(ctx(["G1"]), { ...input, type: "original", scope: { branchId: "branch-of-other-org" } }, deps([]))
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })

  it("nhân viên chi nhánh: bộ lọc luôn là chi nhánh mình + trụ sở", async () => {
    const d = deps([])
    await listLibrary(ctx(["G1"], "branch-a"), { type: "original", scope: "all", q: null, from: null, cursor: null }, d)
    expect(d.listRows).toHaveBeenCalledWith(
      expect.anything(),
      "original",
      expect.objectContaining({ creator: { kind: "exclude", userIds: [], includeUnknown: true } })
    )
  })
})

describe("listLibrary — ảnh bìa", () => {
  it("mục không phải ảnh lấy ảnh bìa: khoá kho → URL ký, không có thì link Drive", async () => {
    const input = { type: "greeting_catalog", scope: "all" as const, q: null, from: null, cursor: null }
    const rows = [row({ id: "c1", type: "greeting_catalog", storageKey: null, mimeType: null }), row({ id: "c2", type: "greeting_catalog", storageKey: null, mimeType: null })]
    const result = await listLibrary(ctx(["L1"]), input, deps(rows))
    expect(result.items.map((i) => [i.thumbnail_url, i.drive_link])).toEqual([
      ["/signed/org/org-a/p/cover.jpg", null],
      [null, "https://drive.google.com/file/d/x/view"],
    ])
  })
})

describe("getLibrarySummary", () => {
  it("chỉ trả loại có quyền, đếm theo phạm vi, chi nhánh của tổ chức", async () => {
    const countRows = vi.fn(async () => 3)
    const summary = await getLibrarySummary(ctx(["G1", "J1"]), "all", { loadDirectory: deps([]).loadDirectory, countRows })
    expect(summary).toEqual({
      types: ["original", "ai_image", "catalog", "landing"],
      counts: { original: 3, ai_image: 3, catalog: 3, landing: 3 },
      is_chain: true,
      viewer_branch_id: null,
      branches: [{ id: "branch-a", name: "Chi nhánh Quận 1" }],
    })
    await expect(
      getLibrarySummary(ctx(["G1"]), { branchId: "x" }, { loadDirectory: deps([]).loadDirectory, countRows })
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
