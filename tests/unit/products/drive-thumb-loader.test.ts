import { describe, expect, it, vi } from "vitest"
import { loadDriveThumbs, MAX_ATTEMPTS, THUMB_BATCH_SIZE, type FetchBatch } from "@/components/products/bulk-import/drive-thumb-loader"
import { driveFolderId, parseDriveLink } from "@/components/products/bulk-import/types"

const ids = (n: number) => Array.from({ length: n }, (_, i) => `folder${String(i).padStart(20, "0")}`)
const ok = (batch: string[]) => ({ status: 200, body: { thumbnails: Object.fromEntries(batch.map((id) => [id, `https://img/${id}`])) } })
const noWait = () => Promise.resolve()

describe("loadDriveThumbs", () => {
  it("file nghìn dòng: gom lô 50, mọi folder đều có ảnh", async () => {
    const fetchBatch = vi.fn<FetchBatch>(async (b) => ok(b))
    const found = new Map<string, string>()
    await loadDriveThumbs(ids(1320), (f) => f.forEach((v, k) => found.set(k, v)), { fetchBatch, wait: noWait })
    expect(found.size).toBe(1320)
    expect(fetchBatch).toHaveBeenCalledTimes(Math.ceil(1320 / THUMB_BATCH_SIZE))
  })

  it("gặp 429 thì chờ và thử lại, không mất ảnh", async () => {
    let calls = 0
    const fetchBatch: FetchBatch = async (b) => (++calls === 1 ? { status: 429 } : ok(b))
    const wait = vi.fn(noWait)
    const found = new Map<string, string>()
    await loadDriveThumbs(ids(3), (f) => f.forEach((v, k) => found.set(k, v)), { fetchBatch, wait })
    expect(found.size).toBe(3)
    expect(wait).toHaveBeenCalledTimes(1)
  })

  it("thử lại có trần; hết lượt → báo missing thay vì chờ mãi", async () => {
    const fetchBatch = vi.fn<FetchBatch>(async () => ({ status: 503 }))
    const missing: string[] = []
    await loadDriveThumbs(ids(2), (_f, m) => missing.push(...m), { fetchBatch, wait: noWait })
    expect(fetchBatch).toHaveBeenCalledTimes(MAX_ATTEMPTS)
    expect(missing).toHaveLength(2)
  })

  it("lỗi 4xx khác 429 không thử lại", async () => {
    const fetchBatch = vi.fn<FetchBatch>(async () => ({ status: 403 }))
    await loadDriveThumbs(ids(1), () => {}, { fetchBatch, wait: noWait })
    expect(fetchBatch).toHaveBeenCalledTimes(1)
  })

  it("folder không có ảnh (null) → missing", async () => {
    const fetchBatch: FetchBatch = async ([a, b]) => ({ status: 200, body: { thumbnails: { [a as string]: "u", [b as string]: null } } })
    const missing: string[] = []
    await loadDriveThumbs(ids(2), (_f, m) => missing.push(...m), { fetchBatch, wait: noWait })
    expect(missing).toEqual([ids(2)[1]])
  })
})

describe("parseDriveLink", () => {
  const id = "1AbCdEfGhIjKlMnOpQrStUv"
  it("nhận cả link folder lẫn link file", () => {
    expect(parseDriveLink(`https://drive.google.com/drive/folders/${id}?usp=sharing`)).toEqual({ kind: "folder", id })
    expect(parseDriveLink(`https://drive.google.com/drive/u/0/folders/${id}`)).toEqual({ kind: "folder", id })
    expect(parseDriveLink(`https://drive.google.com/file/d/${id}/view?usp=sharing`)).toEqual({ kind: "file", id })
    expect(parseDriveLink(`https://drive.google.com/open?id=${id}`)).toEqual({ kind: "file", id })
    expect(parseDriveLink("https://example.com/anh.jpg")).toBeUndefined()
    expect(driveFolderId(`https://drive.google.com/file/d/${id}/view`)).toBeUndefined()
  })
})
