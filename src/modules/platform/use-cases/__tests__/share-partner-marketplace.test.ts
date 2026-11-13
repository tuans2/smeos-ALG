import { describe, expect, it, vi } from "vitest"

import type { PlatformContext } from "@/core/platform/platform-context"
import type { StorageProvider } from "@/core/ports/storage-provider"
import type { ShareLinkRecord } from "../../domain/partner-marketplace-share-link"
import { rowToProfile, searchTextOf } from "../../domain/partner-marketplace-row-mapper"
import type { IPartnerMarketplaceRepository } from "../../domain/repositories/partner-marketplace-repository.interface"
import type { IPartnerMarketplaceShareLinkRepository } from "../../domain/repositories/partner-marketplace-share-link-repository.interface"
import { createShareLink, hashShareToken, listShareLinks, revokeShareLink, viewSharedMarketplace, type ShareDeps } from "../share-partner-marketplace"

const pctx = (codes: string[]): PlatformContext => ({ userId: "ops-1", capabilities: new Set(codes) }) as PlatformContext
const NOW = new Date("2026-11-01T00:00:00Z")
const TOKEN = "a".repeat(43)

function makeDeps(existing: Partial<ShareLinkRecord> | null = null) {
  const r = Array.from({ length: 75 }, () => "")
  r[5] = "Hoa A"
  r[13] = "0903456789"
  const profile = { ...rowToProfile(r)!, id: "s1" }
  const repo = {
    listAll: vi.fn(async () => [{ store: profile, searchText: searchTextOf(profile), photoKeys: [] }]),
  } as unknown as IPartnerMarketplaceRepository
  const record: ShareLinkRecord | null = existing && {
    id: "l1",
    label: "BOD",
    expiresAt: new Date("2026-11-08T00:00:00Z"),
    revokedAt: null,
    createdBy: "ops-1",
    viewCount: 0,
    lastViewedAt: null,
    createdAt: NOW,
    ...existing,
  }
  const links: IPartnerMarketplaceShareLinkRepository = {
    create: vi.fn(async (i) => ({ id: "new", label: i.label, expiresAt: i.expiresAt, revokedAt: null, createdBy: i.createdBy, viewCount: 0, lastViewedAt: null, createdAt: NOW })),
    list: vi.fn(async () => (record ? [record] : [])),
    findById: vi.fn(async () => record),
    findByTokenHash: vi.fn(async (h) => (h === hashShareToken(TOKEN) ? record : null)),
    revoke: vi.fn(async () => undefined),
    recordView: vi.fn(async () => undefined),
  }
  const deps: ShareDeps = {
    repo,
    storage: { signedUrl: vi.fn() } as unknown as StorageProvider,
    audit: vi.fn(async () => ({}) as never),
    links,
    now: () => NOW,
    newToken: () => TOKEN,
  }
  return deps
}

describe("link chia sẻ — quản lý", () => {
  it("tạo / huỷ / liệt kê cần N17, không ghi gì khi thiếu", async () => {
    const d = makeDeps({})
    await expect(createShareLink(pctx(["N1"]), { label: "BOD", days: 7 }, d)).rejects.toMatchObject({ status: 403 })
    await expect(revokeShareLink(pctx(["N1"]), "l1", d)).rejects.toMatchObject({ status: 403 })
    await expect(listShareLinks(pctx(["N1"]), d)).rejects.toMatchObject({ status: 403 })
    expect(d.links.create).not.toHaveBeenCalled()
    expect(d.links.revoke).not.toHaveBeenCalled()
  })

  it("tạo: chỉ lưu bản băm, hạn theo số ngày chọn, ghi nhật ký; token gốc trả một lần", async () => {
    const d = makeDeps()
    const res = await createShareLink(pctx(["N17"]), { label: " BOD quý 4 ", days: 30 }, d)
    expect(res.token).toBe(TOKEN)
    expect(d.links.create).toHaveBeenCalledWith({
      tokenHash: hashShareToken(TOKEN),
      label: "BOD quý 4",
      expiresAt: new Date("2026-12-01T00:00:00Z"),
      createdBy: "ops-1",
    })
    expect(JSON.stringify(vi.mocked(d.links.create).mock.calls)).not.toContain(TOKEN)
    expect(d.audit).toHaveBeenCalledOnce()
  })

  it("tạo: từ chối thời hạn ngoài 1–365 ngày và ghi chú rỗng", async () => {
    const d = makeDeps()
    await expect(createShareLink(pctx(["N17"]), { label: "x", days: 0 }, d)).rejects.toMatchObject({ status: 422 })
    await expect(createShareLink(pctx(["N17"]), { label: "x", days: 366 }, d)).rejects.toMatchObject({ status: 422 })
    await expect(createShareLink(pctx(["N17"]), { label: "  ", days: 7 }, d)).rejects.toMatchObject({ status: 422 })
  })

  it("huỷ: có hiệu lực ngay, ghi nhật ký; link không tồn tại → 404", async () => {
    const d = makeDeps({})
    const res = await revokeShareLink(pctx(["N17"]), "l1", d)
    expect(res.status).toBe("REVOKED")
    expect(d.links.revoke).toHaveBeenCalledWith("l1", NOW)
    expect(d.audit).toHaveBeenCalledOnce()
    await expect(revokeShareLink(pctx(["N17"]), "x", makeDeps())).rejects.toMatchObject({ status: 404 })
  })
})

describe("link chia sẻ — xem công khai", () => {
  it("link còn hạn: trả danh sách đã che, đếm lượt xem", async () => {
    const d = makeDeps({})
    const res = await viewSharedMarketplace(TOKEN, d)
    expect(JSON.stringify(res.stores)).not.toContain("0903456789")
    expect(d.links.recordView).toHaveBeenCalledWith("l1", NOW)
  })

  it("token sai dạng / không tồn tại / hết hạn / đã huỷ → 404 như nhau, không đọc dữ liệu", async () => {
    for (const [token, rec] of [
      ["ngắn", {}],
      ["b".repeat(43), {}],
      [TOKEN, { expiresAt: NOW }],
      [TOKEN, { revokedAt: new Date("2026-10-31T00:00:00Z") }],
    ] as const) {
      const d = makeDeps(rec)
      await expect(viewSharedMarketplace(token, d)).rejects.toMatchObject({ status: 404 })
      expect(d.repo.listAll).not.toHaveBeenCalled()
    }
  })
})
