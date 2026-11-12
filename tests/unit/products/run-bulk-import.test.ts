import { afterEach, describe, expect, it, vi } from "vitest"
import { runBulkImport } from "@/components/products/bulk-import/run-bulk-import"
import { mapRecordToRow } from "@/components/products/bulk-import/parse-product-sheet"

const rows = Array.from({ length: 300 }, (_, i) => mapRecordToRow({ SKU: `FL-${i}`, name: `Mẫu ${i}` }, i))

describe("runBulkImport", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("gửi theo lô 250 và cộng dồn kết quả", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const n = (JSON.parse(String(init.body)) as { items: unknown[] }).items.length
      return new Response(JSON.stringify({ data: { created_count: n, skipped_count: 0, failed_count: 0, failed: [] } }))
    })
    vi.stubGlobal("fetch", fetchMock)
    const result = await runBulkImport(rows, () => {})
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({ success: true, createdCount: 300, failedCount: 0 })
  })

  it("lô sau lỗi → giữ số đã lưu ở lô trước, liệt kê đúng các mã chưa gửi", async () => {
    let call = 0
    vi.stubGlobal("fetch", vi.fn(async () => {
      call++
      return call === 1
        ? new Response(JSON.stringify({ data: { created_count: 250, skipped_count: 0, failed_count: 0 } }))
        : new Response("boom", { status: 500 })
    }))
    const result = await runBulkImport(rows, () => {})
    expect(result.success).toBe(false)
    expect(result.createdCount).toBe(250)
    expect(result.failedCount).toBe(50)
    expect(result.failedItems[0]?.code).toBe("FL-250")
  })

  it("cộng dồn số ảnh được bù cho mã đã có", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { created_count: 0, skipped_count: 250, images_attached_count: 7, failed_count: 0 } }))))
    const result = await runBulkImport(rows, () => {})
    expect(result.imagesAttachedCount).toBe(14)
  })
})
