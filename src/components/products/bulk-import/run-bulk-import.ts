import { serializePricing } from "@/modules/products/domain/product-pricing"
import { parseFlowersText } from "./parse-product-sheet"
import type { ImportProgress, ImportResult, ParsedProductRow } from "./types"

/** Trần mỗi lần gửi — dưới trần 500 của schema batch-import và tránh timeout. */
const BATCH_CHUNK = 250

async function uploadAssetFile(file: File): Promise<string> {
  const urlRes = await fetch("/api/v1/assets/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: null, mime_type: file.type }),
  })
  if (!urlRes.ok) throw new Error(`Không lấy được URL tải lên cho ${file.name}`)
  const { asset_id, storage_key, upload_url } = (await urlRes.json()) as { asset_id: string; storage_key: string; upload_url: string }

  const putRes = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": file.type }, body: file })
  if (!putRes.ok) throw new Error(`Tải ảnh ${file.name} thất bại`)

  const registerRes = await fetch("/api/v1/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ asset_id, product_id: null, kind: "ORIGINAL", storage_key, mime_type: file.type, file_size: file.size }),
  })
  if (!registerRes.ok) throw new Error(`Đăng ký ảnh ${file.name} thất bại`)
  return asset_id
}

export function toBatchItem(row: ParsedProductRow, imageAssetId: string | null) {
  return {
    code: row.code,
    name: row.name,
    category: row.category,
    shape: row.shape,
    facing: row.facing,
    container: row.container || null,
    status: "ACTIVE" as const,
    attributes: {
      ...(row.pricing ? serializePricing(row.pricing) : { price: row.price, price_vnd: row.price }),
      color: row.color || null,
      description: row.description || null,
      drive_link: row.driveLink || null,
      lovi_code: row.loviCode || null,
      siin_code: row.siinCode || null,
      bom: { flowers: parseFlowersText(row.flowersText) },
    },
    image_asset_id: imageAssetId,
  }
}

/** `data` của `POST /products/batch-import`. */
type ImportChunkResult = { created_count?: number; updated_count?: number; skipped_count?: number; images_attached_count?: number; drive_links_updated_count?: number; failed_count?: number; failed?: Array<{ code: string; error: string }> }

/**
 * (1) tải ảnh đã khớp — lỗi ảnh không chặn sản phẩm; (2) gửi từng lô 250.
 * Một lô lỗi → dừng, nhưng kết quả vẫn giữ số đã lưu từ các lô trước và liệt kê mã chưa gửi.
 */
export async function runBulkImport(rows: ParsedProductRow[], onProgress: (p: ImportProgress) => void): Promise<ImportResult> {
  const valid = rows.filter((r) => r.status !== "ERROR")
  const withImage = valid.filter((r) => r.matchedFile)
  const assetIds = new Map<number, string | null>()
  let uploaded = 0
  for (const row of withImage) {
    onProgress({ current: uploaded + 1, total: withImage.length, phase: `Đang tải ảnh: ${row.matchedFile!.name}...` })
    try {
      assetIds.set(row.index, await uploadAssetFile(row.matchedFile!))
      uploaded++
    } catch {
      assetIds.set(row.index, null)
    }
  }

  const items = valid.map((row) => toBatchItem(row, assetIds.get(row.index) ?? null))
  const result: ImportResult = { success: true, createdCount: 0, updatedCount: 0, skippedCount: 0, imagesAttachedCount: 0, driveLinksUpdatedCount: 0, failedCount: 0, failedItems: [] }

  for (let i = 0; i < items.length; i += BATCH_CHUNK) {
    const chunk = items.slice(i, i + BATCH_CHUNK)
    const done = Math.min(i + chunk.length, items.length)
    onProgress({ current: done, total: items.length, phase: `Đang lưu sản phẩm (${done}/${items.length})...` })
    let body: ImportChunkResult | null = null
    try {
      const res = await fetch("/api/v1/products/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: chunk, skip_duplicates: true, overwrite_existing: true, overwrite_existing_images: true }),
      })
      if (res.ok) body = ((await res.json()) as { data: ImportChunkResult }).data
    } catch {
      body = null
    }
    if (!body) {
      const unsent = items.slice(i)
      result.success = false
      result.failedCount += unsent.length
      result.failedItems.push(...unsent.map((it) => ({ code: it.code, error: "Chưa lưu được — mất kết nối hoặc máy chủ lỗi, hãy nạp lại" })))
      break
    }
    result.createdCount += body.created_count ?? 0
    result.updatedCount += body.updated_count ?? 0
    result.skippedCount += body.skipped_count ?? 0
    result.imagesAttachedCount += body.images_attached_count ?? 0
    result.driveLinksUpdatedCount += body.drive_links_updated_count ?? 0
    result.failedCount += body.failed_count ?? 0
    if (Array.isArray(body.failed)) result.failedItems.push(...body.failed)
  }
  return result
}
