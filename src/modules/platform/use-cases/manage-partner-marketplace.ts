/**
 * Chợ đối tác (SaaS Mẹ): xem cần `N1`; đồng bộ Sheet / nhập Excel / tải ảnh cần
 * `N17` và luôn ghi nhật ký nền tảng. Ảnh chỉ phát qua URL ký có hạn.
 */
import { unprocessable } from "@/core/http/errors"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import type { PlatformContext } from "@/core/platform/platform-context"
import type { StorageProvider } from "@/core/ports/storage-provider"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"
import { recordPlatformAuditLog } from "../infra/platform-audit-repository"
import { getPartnerMarketplaceRepository } from "../infra/partner-marketplace-repository"
import { parseMarketplaceWorkbook } from "../infra/parse-marketplace-excel"
import { GoogleWorkspaceError, getGoogleWorkspaceClient, type GoogleWorkspaceClient } from "../adapters/google-workspace-client"
import { filterMarketplaceStores, type ListMarketplaceStoresFilter, type ListMarketplaceStoresResult } from "../domain/partner-marketplace-filter"
import { maskMarketplaceStore } from "../domain/partner-marketplace-mask"
import { MAX_PHOTOS_PER_STORE, driveThumbnailUrl, rowsToProfiles } from "../domain/partner-marketplace-row-mapper"
import { detectColumnMapping, validateColumnMapping, type ColumnMapping } from "../domain/partner-marketplace-column-match"
import type { IPartnerMarketplaceRepository, MarketplaceImportSource } from "../domain/repositories/partner-marketplace-repository.interface"
import { downloadStorePhotos, partnerPhotoKeyPrefix } from "./partner-marketplace-photos"

export type MarketplaceDeps = {
  repo: IPartnerMarketplaceRepository
  storage: StorageProvider
  google: GoogleWorkspaceClient
  audit: typeof recordPlatformAuditLog
  env: Readonly<Record<string, string | undefined>>
}

/**
 * Kho tệp và Google dựng khi dùng tới: nhập Excel / đồng bộ Sheet chỉ ghi DB, nên không hỏng
 * theo cấu hình kho (production thiếu `STORAGE_*` → `getStorageProvider()` ném lỗi).
 */
function defaultDeps(): MarketplaceDeps {
  return {
    repo: getPartnerMarketplaceRepository(),
    get storage() {
      return getStorageProvider()
    },
    get google() {
      return getGoogleWorkspaceClient()
    },
    audit: recordPlatformAuditLog,
    env: process.env,
  }
}

/** Hạn URL ảnh trả cho trình duyệt. */
export const PHOTO_URL_TTL_SECONDS = 3600

export async function listMarketplaceStores(
  pctx: PlatformContext,
  filter: ListMarketplaceStoresFilter = {},
  deps: Pick<MarketplaceDeps, "repo" | "storage"> = defaultDeps()
): Promise<ListMarketplaceStoresResult> {
  requirePlatformCapability(pctx, "N1")
  return listMaskedStores(filter, deps)
}

/**
 * Danh sách đã che một phần thông tin nhạy cảm (PO 01/11/2026) — dùng chung cho console
 * và link chia sẻ công khai. Người gọi tự kiểm quyền.
 */
export async function listMaskedStores(
  filter: ListMarketplaceStoresFilter,
  deps: Pick<MarketplaceDeps, "repo" | "storage">
): Promise<ListMarketplaceStoresResult> {
  const entries = await deps.repo.listAll()
  const keysById = new Map(entries.map((e) => [e.store.id, e.photoKeys]))
  const result = filterMarketplaceStores(entries, filter)
  const stores = await Promise.all(
    result.stores.map(async (store) => {
      const urls = await photoUrlsFor(store.id, store.media.driveImageIds ?? [], keysById.get(store.id) ?? [], deps.storage)
      const masked = maskMarketplaceStore(store)
      return { ...masked, media: { ...masked.media, photoGalleryUrls: urls, coverPhotoUrl: urls[0] } }
    })
  )
  return { ...result, stores }
}

/**
 * Ảnh theo thứ tự trên phiếu khảo sát: đã có trong kho → URL ký; chưa có → ảnh xem trước
 * công khai của Drive, để hồ sơ luôn có ảnh kể cả trước khi bấm "Tải ảnh khảo sát".
 */
async function photoUrlsFor(storeId: string, driveIds: string[], keys: string[], storage: StorageProvider): Promise<string[]> {
  const prefix = partnerPhotoKeyPrefix(storeId)
  const ids = driveIds.slice(0, MAX_PHOTOS_PER_STORE)
  const fromDrive = await Promise.all(
    ids.map((id) => {
      const key = keys.find((k) => k.startsWith(`${prefix}${id}.`))
      return key ? storage.signedUrl(key, PHOTO_URL_TTL_SECONDS, "GET") : driveThumbnailUrl(id)
    })
  )
  // Khoá kho không còn ứng với Drive id nào trên phiếu (phiếu đã sửa) vẫn hiển thị
  const orphanKeys = keys.filter((k) => !ids.some((id) => k.startsWith(`${prefix}${id}.`)))
  const extra = await Promise.all(orphanKeys.map((k) => storage.signedUrl(k, PHOTO_URL_TTL_SECONDS, "GET")))
  return [...fromDrive, ...extra]
}

export type ImportSummary = { added: number; updated: number; total: number; skipped: number }

async function importRows(
  pctx: PlatformContext,
  rows: string[][],
  source: MarketplaceImportSource,
  deps: Pick<MarketplaceDeps, "repo" | "audit">,
  mapping?: ColumnMapping
): Promise<ImportSummary> {
  const { profiles, skipped } = rowsToProfiles(rows, mapping)
  if (profiles.length === 0) throw unprocessable("Không có dòng khảo sát nào có tên cửa hàng")
  const result = await deps.repo.upsertMany(profiles, source)
  await deps.audit(pctx, {
    action: source === "SHEET" ? "platform.marketplace.sync_sheet" : "platform.marketplace.import_excel",
    entityType: "partner_marketplace_stores",
    entityId: "*",
    after: { ...result, skipped },
  })
  return { ...result, skipped }
}

export async function syncMarketplaceFromSheet(pctx: PlatformContext, deps: MarketplaceDeps = defaultDeps()): Promise<ImportSummary> {
  requirePlatformCapability(pctx, "N17")
  const sheetId = deps.env.PARTNER_SURVEY_SHEET_ID
  if (!sheetId) throw unprocessable("Chưa cấu hình Google Sheet khảo sát đối tác")
  let rows: string[][]
  try {
    rows = await deps.google.readSheet(sheetId, deps.env.PARTNER_SURVEY_SHEET_GID || undefined)
  } catch (err) {
    if (err instanceof GoogleWorkspaceError) throw unprocessable(`Không đọc được Google Sheet: ${err.message}`)
    throw err
  }
  return importRows(pctx, rows, "SHEET", deps)
}

export const MAX_EXCEL_BYTES = 10 * 1024 * 1024

/** Đọc và kiểm tệp nhập; lỗi → 422 với câu dễ hiểu. */
function readExcelRows(file: { name: string; bytes: Uint8Array }): string[][] {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw unprocessable("Chỉ nhận tệp .xlsx, .xls hoặc .csv")
  if (file.bytes.length === 0 || file.bytes.length > MAX_EXCEL_BYTES) throw unprocessable("Tệp trống hoặc vượt quá 10 MB")
  const rows = parseMarketplaceWorkbook(file.bytes)
  if (!rows || rows.length < 2) throw unprocessable("Không đọc được tệp, hoặc tệp chỉ có dòng tiêu đề")
  return rows
}

const columnCountOf = (rows: readonly (readonly unknown[])[]) => rows.reduce((max, r) => Math.max(max, r.length), 0)

export type ExcelImportPreview = {
  /** Tiêu đề từng cột trong tệp (cột trống tiêu đề → chuỗi rỗng). */
  headers: string[]
  /** Giá trị mẫu đầu tiên không trống của mỗi cột — đã rút gọn, che số điện thoại. */
  samples: string[]
  /** Số dòng dữ liệu (không tính tiêu đề). */
  rowCount: number
} & ReturnType<typeof detectColumnMapping>

const SAMPLE_MAX_CHARS = 80

/** Che dãy số dài (SĐT, số tài khoản) trong giá trị mẫu, giữ 3 số cuối. */
function maskSample(value: string): string {
  const short = value.length > SAMPLE_MAX_CHARS ? `${value.slice(0, SAMPLE_MAX_CHARS)}…` : value
  return short.replace(/\d[\d .-]{5,}\d/g, (m) => `•••${m.replace(/\D/g, "").slice(-3)}`)
}

/** Bước 1 của nhập tệp: đọc tiêu đề, tự ghép cột theo tên để người nhập xem lại và sửa. */
export async function previewMarketplaceExcel(
  pctx: PlatformContext,
  file: { name: string; bytes: Uint8Array }
): Promise<ExcelImportPreview> {
  requirePlatformCapability(pctx, "N17")
  const rows = readExcelRows(file)
  const count = columnCountOf(rows)
  const headers = Array.from({ length: count }, (_, i) => String(rows[0]?.[i] ?? "").trim())
  const data = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? "").trim()))
  const samples = headers.map((_, i) => maskSample(data.map((r) => String(r[i] ?? "").trim()).find(Boolean) ?? ""))
  return { headers, samples, rowCount: data.length, ...detectColumnMapping(headers) }
}

/**
 * Bước 2: nhập theo bảng ghép cột người nhập đã duyệt. Không gửi bảng ghép → tự ghép
 * theo tên tiêu đề như bước xem trước. Thiếu cột Tên cửa hàng → 422, không ghi gì.
 */
export async function importMarketplaceExcel(
  pctx: PlatformContext,
  file: { name: string; bytes: Uint8Array },
  deps: Pick<MarketplaceDeps, "repo" | "audit"> = defaultDeps(),
  mapping?: ColumnMapping
): Promise<ImportSummary> {
  requirePlatformCapability(pctx, "N17")
  const rows = readExcelRows(file)
  const columns = mapping ?? detectColumnMapping(rows[0]!.map((h) => String(h ?? ""))).mapping
  const problem = validateColumnMapping(columns, columnCountOf(rows))
  if (problem) throw unprocessable(problem)
  return importRows(pctx, rows, "EXCEL", deps, columns)
}

/** Số cửa hàng xử lý mỗi lần bấm — giữ request trong giới hạn thời gian. */
export const PHOTO_STORES_PER_RUN = 8

export async function syncMarketplacePhotos(
  pctx: PlatformContext,
  deps: MarketplaceDeps = defaultDeps()
): Promise<{ stores: number; downloaded: number; failed: number; remaining: number }> {
  requirePlatformCapability(pctx, "N17")
  const { items, remaining } = await deps.repo.listPhotoPending(PHOTO_STORES_PER_RUN)
  let downloaded = 0
  let failed = 0
  for (const store of items) {
    const res = await downloadStorePhotos(store, deps)
    downloaded += res.downloaded
    failed += res.failed
    // Chỉ ghi Drive id đã vào kho — ảnh lỗi được thử lại ở lượt sau (repo xếp cửa hàng vừa thử xuống cuối)
    await deps.repo.setPhotos(store.id, res.photoKeys, res.sourceIds)
  }
  const summary = { stores: items.length, downloaded, failed, remaining }
  await deps.audit(pctx, {
    action: "platform.marketplace.sync_photos",
    entityType: "partner_marketplace_stores",
    entityId: "*",
    after: summary,
  })
  return summary
}
