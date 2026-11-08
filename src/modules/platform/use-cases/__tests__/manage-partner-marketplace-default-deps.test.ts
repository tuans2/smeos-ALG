import { describe, expect, it, vi } from "vitest"

import type { PlatformContext } from "@/core/platform/platform-context"

// Production thiếu `STORAGE_*`: dựng kho tệp ném lỗi — nhập Excel (chỉ ghi DB) không được hỏng theo
const storageFactory = vi.hoisted(() => vi.fn(() => {
  throw new Error("Thiếu cấu hình kho tệp dùng chung")
}))
const upsertMany = vi.hoisted(() => vi.fn(async (p: unknown[]) => ({ added: p.length, updated: 0, total: p.length })))
const audit = vi.hoisted(() => vi.fn(async () => ({})))

vi.mock("@/modules/assets/adapters/storage-provider-factory", () => ({ getStorageProvider: storageFactory }))
vi.mock("../../adapters/google-workspace-client", async (orig) => ({
  ...(await orig<typeof import("../../adapters/google-workspace-client")>()),
  getGoogleWorkspaceClient: () => {
    throw new Error("Google chưa cấu hình")
  },
}))
const listAll = vi.hoisted(() => vi.fn(async (): Promise<unknown[]> => []))
vi.mock("../../infra/partner-marketplace-repository", () => ({ getPartnerMarketplaceRepository: () => ({ upsertMany, listAll }) }))
vi.mock("../../infra/platform-audit-repository", () => ({ recordPlatformAuditLog: audit }))

const { importMarketplaceExcel, listMarketplaceStores } = await import("../manage-partner-marketplace")
const { rowToProfile, searchTextOf } = await import("../../domain/partner-marketplace-row-mapper")

const pctx = { userId: "ops-1", capabilities: new Set(["N1", "N17"]) } as PlatformContext

function csvWithShop(name: string): Uint8Array {
  const header = Array.from({ length: 75 }, (_, i) => `Cột ${i}`)
  const row = Array.from({ length: 75 }, () => "")
  row[5] = name
  return new TextEncoder().encode(`${header.join(",")}\n${row.join(",")}\n`)
}

describe("chợ đối tác — phụ thuộc mặc định", () => {
  it("nhập Excel không dựng kho tệp: thiếu cấu hình kho vẫn nhập được", async () => {
    const res = await importMarketplaceExcel(pctx, { name: "khao-sat.csv", bytes: csvWithShop("Hoa A") })
    expect(res).toEqual({ added: 1, updated: 0, total: 1, skipped: 0 })
    expect(upsertMany).toHaveBeenCalledWith([expect.objectContaining({ identity: expect.objectContaining({ shopName: "Hoa A" }) })], "EXCEL")
    expect(audit).toHaveBeenCalledOnce()
    expect(storageFactory).not.toHaveBeenCalled()
  })

  it("chức năng cần kho tệp vẫn báo lỗi cấu hình như cũ", async () => {
    const row = Array.from({ length: 75 }, () => "")
    row[5] = "Hoa A"
    const store = { ...rowToProfile(row)!, id: "s1" }
    listAll.mockResolvedValueOnce([{ store, searchText: searchTextOf(store), photoKeys: [] }])
    await expect(listMarketplaceStores(pctx)).rejects.toThrow("Thiếu cấu hình kho tệp dùng chung")
  })
})
