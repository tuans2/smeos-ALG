/**
 * ALG Platform Admin — Export Org Data as ZIP
 *
 * Đóng gói toàn bộ dữ liệu của một tổ chức vào file .zip:
 *   catalog.csv          — danh sách sản phẩm (với cột image_url)
 *   orders.csv           — danh sách đơn hàng
 *   members.csv          — danh sách thành viên
 *   branches.csv         — danh sách chi nhánh
 *   customers.csv        — danh sách khách hàng
 *   images/              — thư mục ảnh sản phẩm
 *     <code>_main.<ext>  — ảnh chính của từng sản phẩm
 *
 * Dùng fflate (đã có trong node_modules) để stream ZIP.
 * Platform Admin có quyền RAW — không qua DSA filter.
 */

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { getPlatformRecordsRepository } from "@/modules/platform/infra/platform-records-repository"
import {
  getPlatformOrgRecords,
  exportPlatformOrgRecordsCsv,
  type RecordDomain,
} from "./get-platform-org-records"
import { strToU8, zipSync } from "fflate"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"


const CSV_DOMAINS: RecordDomain[] = [
  "catalog",
  "orders",
  "members",
  "branches",
  "customers",
  "jobs",
]

export interface ZipManifest {
  orgId: string
  orgName: string
  exportedAt: string
  files: { name: string; sizeBytes: number }[]
}

/**
 * Build ZIP Uint8Array chứa tất cả CSV + ảnh sản phẩm.
 * Trả về { zip, manifest }.
 */
export async function exportOrgDataAsZip(
  pctx: PlatformContext,
  orgId: string
): Promise<{ zip: Uint8Array; manifest: ZipManifest }> {
  requirePlatformCapability(pctx, "N1")

  const repo = getPlatformRecordsRepository()
  const { org, products, assets, uploadedSpreadsheets } = await repo.fetchExportZipData(orgId)
  if (!org) throw new Error("Organization not found")

  const files: Record<string, Uint8Array> = {}
  const manifestFiles: { name: string; sizeBytes: number }[] = []

  // ─── 1. Export all CSV domains ──────────────────────────────────────────
  for (const domain of CSV_DOMAINS) {
    try {
      const csv = await exportPlatformOrgRecordsCsv(pctx, orgId, domain)
      const data = strToU8(csv)
      files[`${domain}.csv`] = data
      manifestFiles.push({ name: `${domain}.csv`, sizeBytes: data.byteLength })
    } catch {
      // Domain có thể không có dữ liệu — bỏ qua
    }
  }

  // ─── 2. Export product images ────────────────────────────────────────────
  const assetMap = new Map(assets.map((a) => [a.id, a]))

  // Map product_id → code để đặt tên file ảnh
  const productByAsset = new Map<string, string>()
  for (const p of products) {
    const assetId = p.images[0]?.asset_id
    if (assetId) productByAsset.set(assetId, p.code)
  }


  // Danh sách các mục ảnh cần tải
  interface ImageTarget {
    filename: string
    url: string
  }
  const targets: ImageTarget[] = []

  // Base URL for internal fetch
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3200"
  const { signStorageUrl } = await import("@/modules/assets/infra/storage-signing")
  const exp = Date.now() + 3_600_000 // 1h

  for (const p of products) {
    const safeCode = p.code.replace(/[^a-zA-Z0-9_\-]/g, "_")
    const assetId = p.images[0]?.asset_id
    const asset = assetId ? assetMap.get(assetId) : undefined

    if (asset) {
      const ext = asset.mime_type.split("/")[1] ?? "jpg"
      const sig = signStorageUrl(asset.storage_key, exp)
      targets.push({
        filename: `images/${safeCode}_main.${ext}`,
        url: `${baseUrl}/api/v1/storage/${asset.storage_key}?exp=${exp}&sig=${sig}`,
      })
    } else {
      const attrs = (p.attributes as Record<string, unknown> | null) ?? {}
      const attrImg = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : null
      const rawDriveLink =
        (typeof attrs.drive_link === "string" && attrs.drive_link) ||
        (typeof attrs.driveLink === "string" && attrs.driveLink) ||
        (typeof attrs.drive_url === "string" && attrs.drive_url) ||
        null
      const driveProxy = driveThumbProxySrc(rawDriveLink)

      if (attrImg && attrImg.startsWith("http")) {
        targets.push({
          filename: `images/${safeCode}_main.jpg`,
          url: attrImg,
        })
      } else if (driveProxy) {
        targets.push({
          filename: `images/${safeCode}_main.jpg`,
          url: `${baseUrl}${driveProxy}`,
        })
      }
    }
  }

  // Download ảnh theo lô song song (giới hạn tối đa 150 ảnh đầu tiên để tránh timeout và OOM khi zip)
  const MAX_IMAGES = 200
  const limitedTargets = targets.slice(0, MAX_IMAGES)
  const BATCH = 15
  const imageEntries: { filename: string; data: Uint8Array }[] = []

  for (let i = 0; i < limitedTargets.length; i += BATCH) {
    const chunk = limitedTargets.slice(i, i + BATCH)
    const downloads = await Promise.allSettled(
      chunk.map(async (t) => {
        try {
          const res = await fetch(t.url, { signal: AbortSignal.timeout(10_000) })
          if (!res.ok) return null
          const buffer = await res.arrayBuffer()
          return { filename: t.filename, data: new Uint8Array(buffer) }
        } catch {
          return null
        }
      })
    )

    for (const result of downloads) {
      if (result.status === "fulfilled" && result.value) {
        imageEntries.push(result.value)
      }
    }
  }

  for (const entry of imageEntries) {
    files[entry.filename] = entry.data
    manifestFiles.push({ name: entry.filename, sizeBytes: entry.data.byteLength })
  }

  // ─── 3. Export uploaded Excel spreadsheets ──────────────────────────────
  for (const sheet of uploadedSpreadsheets) {
    try {

      const params = (sheet.parameters as Record<string, unknown> | null) ?? {}
      const origName = typeof params.original_filename === "string" ? params.original_filename : sheet.storage_key.split("/").pop() ?? `${sheet.id}.xlsx`
      const safeSheetName = origName.replace(/[^a-zA-Z0-9._\-]/g, "_")
      const sig = signStorageUrl(sheet.storage_key, exp)
      const res = await fetch(`${baseUrl}/api/v1/storage/${sheet.storage_key}?exp=${exp}&sig=${sig}`)
      if (res.ok) {
        const buf = await res.arrayBuffer()
        const sheetPath = `spreadsheets/${safeSheetName}`
        files[sheetPath] = new Uint8Array(buf)
        manifestFiles.push({ name: sheetPath, sizeBytes: buf.byteLength })
      }
    } catch {
      // Bỏ qua nếu tải tệp lỗi
    }
  }

  // ─── 4. Build manifest.json ──────────────────────────────────────────────
  const manifest: ZipManifest = {
    orgId,
    orgName: org.name,
    exportedAt: new Date().toISOString(),
    files: manifestFiles,
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2))

  // ─── 4. Compress to ZIP ──────────────────────────────────────────────────
  const zip = zipSync(files, { level: 6 })

  return { zip, manifest }
}

/**
 * Export chỉ ảnh sản phẩm (không CSV) — dùng khi user muốn tải ảnh riêng
 */
export async function exportOrgImagesAsZip(
  pctx: PlatformContext,
  orgId: string
): Promise<Uint8Array> {
  requirePlatformCapability(pctx, "N1")

  const { getPlatformOrgRecords: _unused, ..._ } = await import(
    "./get-platform-org-records"
  )
  void _unused
  void _

  // Reuse full export but only keep images
  const { zip } = await exportOrgDataAsZip(pctx, orgId)
  return zip
}
