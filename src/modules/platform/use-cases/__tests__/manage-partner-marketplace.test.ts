import { describe, expect, it, vi } from "vitest"

import type { PlatformContext } from "@/core/platform/platform-context"
import type { StorageProvider } from "@/core/ports/storage-provider"
import {
  importMarketplaceExcel,
  listMarketplaceStores,
  previewMarketplaceExcel,
  syncMarketplaceFromSheet,
  syncMarketplacePhotos,
  type MarketplaceDeps,
} from "../manage-partner-marketplace"
import { GoogleWorkspaceError, type GoogleWorkspaceClient } from "../../adapters/google-workspace-client"
import type { IPartnerMarketplaceRepository } from "../../domain/repositories/partner-marketplace-repository.interface"
import { rowToProfile, searchTextOf } from "../../domain/partner-marketplace-row-mapper"

const pctx = (codes: string[]): PlatformContext => ({ userId: "ops-1", capabilities: new Set(codes) }) as PlatformContext
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
const HTML = new TextEncoder().encode("<html>login</html>")

function sheetRow(name: string, drive = ""): string[] {
  const r = Array.from({ length: 75 }, () => "")
  r[5] = name
  r[64] = drive
  return r
}

function makeDeps(over: Partial<MarketplaceDeps> = {}) {
  const profile = { ...rowToProfile(sheetRow("Hoa A", "x?id=storedfile01 x?id=publiconly02"))!, id: "s1" }
  const repo: IPartnerMarketplaceRepository = {
    listAll: vi.fn(async () => [{ store: profile, searchText: searchTextOf(profile), photoKeys: ["platform/partner-stores/s1/storedfile01.jpg"] }]),
    upsertMany: vi.fn(async (p) => ({ added: p.length, updated: 0, total: p.length })),
    listPhotoPending: vi.fn(async () => ({
      items: [{ id: "s1", driveImageIds: ["goodfile0001", "badfile00002", "kept0000003"], photoKeys: ["platform/partner-stores/s1/kept0000003.jpg"], photoSourceIds: [] }],
      remaining: 4,
    })),
    setPhotos: vi.fn(async () => undefined),
    deleteById: vi.fn(async () => null),
    deleteMany: vi.fn(async () => null),
  }
  const storage = {
    put: vi.fn(async () => undefined),
    signedUrl: vi.fn(async (k: string) => `/api/v1/storage/${k}?sig=x`),
  } as unknown as StorageProvider
  const google: GoogleWorkspaceClient = {
    readSheet: vi.fn(async () => [sheetRow("Tiêu đề"), sheetRow("Hoa A"), sheetRow("Hoa B")]),
    downloadDriveFile: vi.fn(async (id: string) => (id === "goodfile0001" ? JPEG : HTML)),
  }
  const deps: MarketplaceDeps = { repo, storage, google, audit: vi.fn(async () => ({}) as never), env: { PARTNER_SURVEY_SHEET_ID: "sheet" }, ...over }
  return deps
}

describe("chợ đối tác — phân quyền", () => {
  it("xem cần N1; đồng bộ / nhập / ảnh cần N17 và không ghi gì khi thiếu", async () => {
    const d = makeDeps()
    await expect(listMarketplaceStores(pctx(["N17"]), {}, d)).rejects.toMatchObject({ status: 403 })
    await expect(syncMarketplaceFromSheet(pctx(["N1"]), d)).rejects.toMatchObject({ status: 403 })
    await expect(importMarketplaceExcel(pctx(["N1"]), { name: "a.xlsx", bytes: JPEG }, d)).rejects.toMatchObject({ status: 403 })
    await expect(syncMarketplacePhotos(pctx(["N1"]), d)).rejects.toMatchObject({ status: 403 })
    expect(d.repo.upsertMany).not.toHaveBeenCalled()
    expect(d.storage.put).not.toHaveBeenCalled()
    expect(d.audit).not.toHaveBeenCalled()
  })
})

describe("listMarketplaceStores", () => {
  it("ảnh đã có trong kho → URL ký (GET); ảnh chưa tải → xem trước Drive công khai, giữ thứ tự phiếu", async () => {
    const d = makeDeps()
    const res = await listMarketplaceStores(pctx(["N1"]), {}, d)
    expect(d.storage.signedUrl).toHaveBeenCalledWith("platform/partner-stores/s1/storedfile01.jpg", 3600, "GET")
    expect(res.stores[0]!.media.coverPhotoUrl).toContain("sig=")
    expect(res.stores[0]!.media.photoGalleryUrls![1]).toBe("https://drive.google.com/thumbnail?id=publiconly02&sz=w1000")
  })
})

describe("syncMarketplaceFromSheet", () => {
  it("upsert các dòng có tên và ghi nhật ký nền tảng", async () => {
    const d = makeDeps()
    await expect(syncMarketplaceFromSheet(pctx(["N17"]), d)).resolves.toEqual({ added: 2, updated: 0, total: 2, skipped: 0 })
    expect(d.repo.upsertMany).toHaveBeenCalledWith(expect.any(Array), "SHEET")
    expect(d.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "platform.marketplace.sync_sheet" }))
  })

  it("thiếu cấu hình Sheet hoặc Google lỗi → 422 dễ hiểu, không ghi", async () => {
    await expect(syncMarketplaceFromSheet(pctx(["N17"]), makeDeps({ env: {} }))).rejects.toMatchObject({ status: 422 })
    const google = { readSheet: vi.fn(async () => { throw new GoogleWorkspaceError("Google trả lỗi 403", "request") }), downloadDriveFile: vi.fn() }
    const d = makeDeps({ google })
    await expect(syncMarketplaceFromSheet(pctx(["N17"]), d)).rejects.toMatchObject({ status: 422 })
    expect(d.repo.upsertMany).not.toHaveBeenCalled()
  })
})

describe("importMarketplaceExcel", () => {
  it("chặn đuôi tệp lạ, tệp rỗng và tệp không đọc được", async () => {
    const d = makeDeps()
    await expect(importMarketplaceExcel(pctx(["N17"]), { name: "a.exe", bytes: JPEG }, d)).rejects.toMatchObject({ status: 422 })
    await expect(importMarketplaceExcel(pctx(["N17"]), { name: "a.xlsx", bytes: new Uint8Array() }, d)).rejects.toMatchObject({ status: 422 })
    expect(d.repo.upsertMany).not.toHaveBeenCalled()
  })

  it("nhập CSV hợp lệ", async () => {
    const d = makeDeps()
    const csv = [sheetRow("Tiêu đề"), sheetRow("Hoa CSV")].map((r) => r.join(",")).join("\n")
    const res = await importMarketplaceExcel(pctx(["N17"]), { name: "khao-sat.csv", bytes: new TextEncoder().encode(csv) }, d)
    expect(res.added).toBe(1)
    expect(d.repo.upsertMany).toHaveBeenCalledWith([expect.objectContaining({ identity: expect.objectContaining({ shopName: "Hoa CSV" }) })], "EXCEL")
  })
})

describe("nhập tệp lệch cột", () => {
  // BOM UTF-8 như Excel ghi khi lưu CSV — để chữ có dấu đọc đúng
  const csv = (lines: string[][]) => new TextEncoder().encode("\uFEFF" + lines.map((r) => r.join(",")).join("\n"))
  const shifted = csv([
    ["Tên cửa hàng", "Chức vụ", "Địa chỉ", "Số điện thoại", "Quy mô"],
    ["Hoa Lệch", "chủ cửa hàng", "49 Nguyễn Phong Sắc", "0912345682", "2 cửa hàng"],
  ])

  it("xem trước: tự ghép theo tên tiêu đề, giá trị mẫu che số điện thoại, không ghi dữ liệu", async () => {
    const d = makeDeps()
    const p = await previewMarketplaceExcel(pctx(["N17"]), { name: "moi.csv", bytes: shifted })
    expect(p.headers).toEqual(["Tên cửa hàng", "Chức vụ", "Địa chỉ", "Số điện thoại", "Quy mô"])
    expect(p.rowCount).toBe(1)
    expect(p.mapping[5]).toBe(0)
    expect(p.mapping[15]).toBe(2)
    expect(p.mapping[13]).toBe(3)
    expect(p.samples[3]).toBe("•••682")
    expect(d.repo.upsertMany).not.toHaveBeenCalled()
    await expect(previewMarketplaceExcel(pctx(["N1"]), { name: "moi.csv", bytes: shifted })).rejects.toMatchObject({ status: 403 })
  })

  it("nhập không gửi bảng ghép → tự ghép theo tên, dữ liệu vào đúng trường", async () => {
    const d = makeDeps()
    await importMarketplaceExcel(pctx(["N17"]), { name: "moi.csv", bytes: shifted }, d)
    const [profiles] = vi.mocked(d.repo.upsertMany).mock.calls[0]!
    expect(profiles[0]!.contact.address).toBe("49 Nguyễn Phong Sắc")
    expect(profiles[0]!.contact.phone).toBe("0912345682")
    expect(profiles[0]!.identity.scale).toBe("2 cửa hàng")
  })

  it("bảng ghép người nhập chọn được dùng; thiếu cột tên cửa hàng → 422, không ghi", async () => {
    const d = makeDeps()
    const mapping = Array.from({ length: 75 }, () => null as number | null)
    mapping[5] = 0
    mapping[16] = 2 // người nhập chủ động đưa cột Địa chỉ vào Google Maps
    await importMarketplaceExcel(pctx(["N17"]), { name: "moi.csv", bytes: shifted }, d, mapping)
    const [profiles] = vi.mocked(d.repo.upsertMany).mock.calls[0]!
    expect(profiles[0]!.contact.googleMaps).toBe("49 Nguyễn Phong Sắc")
    expect(profiles[0]!.contact.address).toBe("")

    const d2 = makeDeps()
    const noName = csv([["Chức vụ", "Địa chỉ"], ["chủ", "x"]])
    await expect(importMarketplaceExcel(pctx(["N17"]), { name: "a.csv", bytes: noName }, d2)).rejects.toMatchObject({ status: 422 })
    expect(d2.repo.upsertMany).not.toHaveBeenCalled()
  })
})

describe("syncMarketplacePhotos", () => {
  it("ghi ảnh hợp lệ vào kho khoá platform/, bỏ tệp không phải ảnh, giữ ảnh đã có; ảnh lỗi chưa đánh dấu để thử lại", async () => {
    const d = makeDeps()
    const res = await syncMarketplacePhotos(pctx(["N17"]), d)
    expect(res).toEqual({ stores: 1, downloaded: 1, failed: 1, remaining: 4 })
    expect(d.storage.put).toHaveBeenCalledTimes(1)
    expect(d.storage.put).toHaveBeenCalledWith("platform/partner-stores/s1/goodfile0001.jpg", JPEG, "image/jpeg")
    expect(d.google.downloadDriveFile).not.toHaveBeenCalledWith("kept0000003", expect.anything())
    expect(d.repo.setPhotos).toHaveBeenCalledWith(
      "s1",
      ["platform/partner-stores/s1/goodfile0001.jpg", "platform/partner-stores/s1/kept0000003.jpg"],
      ["goodfile0001", "kept0000003"]
    )
    expect(d.audit).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ action: "platform.marketplace.sync_photos" }))
  })
})
