/**
 * ALG Platform Admin — Get Org Actual Records (Platform-Level)
 *
 * Trả về bản ghi thực tế (không phải schema metadata) của từng domain:
 * - catalog: danh sách sản phẩm đầy đủ
 * - orders: danh sách đơn hàng
 * - members: danh sách thành viên
 * - branches: danh sách chi nhánh
 * - customers: danh sách khách hàng
 * - jobs: danh sách AI generation jobs
 *
 * Sử dụng cursor-based pagination (max 100/page theo A10).
 * Platform Admin có quyền xem RAW không qua DSA.
 */

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"
import { PlatformRecordsRepository, getPlatformRecordsRepository } from "../infra/platform-records-repository"

export type RecordDomain =
  | "catalog"
  | "orders"
  | "members"
  | "branches"
  | "customers"
  | "jobs"
  | "spreadsheets"

export interface RecordColumn {
  readonly key: string
  readonly label: string
  readonly type: "text" | "number" | "date" | "badge" | "money" | "image"
}

export interface PlatformOrgRecordsResult {
  readonly domain: RecordDomain
  readonly columns: readonly RecordColumn[]
  readonly rows: readonly Record<string, unknown>[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly totalPages: number
}

const PAGE_SIZE = 100

export async function getPlatformOrgRecords(
  pctx: PlatformContext,
  orgId: string,
  domain: RecordDomain,
  page = 1,
  repo: PlatformRecordsRepository = getPlatformRecordsRepository()
): Promise<PlatformOrgRecordsResult> {
  requirePlatformCapability(pctx, "N1")

  const skip = (page - 1) * PAGE_SIZE

  switch (domain) {
    case "catalog": {
      const { total, products, assets } = await repo.fetchCatalogRecords(orgId, skip, PAGE_SIZE)
      const assetMap = new Map(assets.map((a) => [a.id, a]))

      const exp = Date.now() + 86_400_000 // 24h signed URL

      return {
        domain,
        columns: [
          { key: "image_thumb", label: "Ảnh", type: "image" },
          { key: "code", label: "Mã SP", type: "text" },
          { key: "name", label: "Tên sản phẩm", type: "text" },
          { key: "category", label: "Danh mục", type: "text" },
          { key: "shape", label: "Kiểu dáng", type: "text" },
          { key: "status", label: "Trạng thái", type: "badge" },
          { key: "price_vnd", label: "Giá (VNĐ)", type: "money" },
          { key: "image_url", label: "URL ảnh gốc", type: "text" },
          { key: "created_at", label: "Tạo lúc", type: "date" },
        ],
        rows: products.map((p) => {
          const attrs = (p.attributes as Record<string, unknown> | null) ?? {}
          const assetId = p.images[0]?.asset_id
          const asset = assetId ? assetMap.get(assetId) : undefined
          const thumbKey = asset?.thumb_key ?? asset?.storage_key
          const mainKey = asset?.storage_key

          const storageThumbUrl = thumbKey
            ? `/api/v1/storage/${thumbKey}?exp=${exp}&sig=${signStorageUrl(thumbKey, exp)}`
            : null
          const storageImageUrl = mainKey
            ? `/api/v1/storage/${mainKey}?exp=${exp}&sig=${signStorageUrl(mainKey, exp)}`
            : null

          const attrImageUrl = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : null
          const rawDriveLink =
            (typeof attrs.drive_link === "string" && attrs.drive_link) ||
            (typeof attrs.driveLink === "string" && attrs.driveLink) ||
            (typeof attrs.drive_url === "string" && attrs.drive_url) ||
            null
          const driveProxyUrl = driveThumbProxySrc(rawDriveLink)

          const thumbUrl = storageThumbUrl ?? attrImageUrl ?? driveProxyUrl ?? null
          const imageUrl = storageImageUrl ?? attrImageUrl ?? rawDriveLink ?? null

          return {
            id: p.id,
            image_thumb: thumbUrl ?? "—",
            code: p.code,
            name: p.name,
            category: p.category ?? "—",
            shape: p.shape ?? "—",
            status: p.status,
            price_vnd:
              typeof attrs.price_vnd === "number"
                ? attrs.price_vnd
                : typeof attrs.price === "number"
                ? attrs.price
                : "—",
            image_url: imageUrl ?? "—",
            created_at: p.created_at.toISOString(),
          }
        }),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "orders": {
      const { total, orders } = await repo.fetchOrderRecords(orgId, skip, PAGE_SIZE)
      return {
        domain,
        columns: [
          { key: "code", label: "Mã đơn", type: "text" },
          { key: "customer_name", label: "Khách hàng", type: "text" },
          { key: "customer_phone", label: "SĐT", type: "text" },
          { key: "status", label: "Trạng thái", type: "badge" },
          { key: "production_status", label: "Sản xuất", type: "badge" },
          { key: "total_vnd", label: "Tổng tiền (VNĐ)", type: "money" },
          { key: "paid_vnd", label: "Đã thu (VNĐ)", type: "money" },
          { key: "source", label: "Nguồn", type: "text" },
          { key: "created_at", label: "Tạo lúc", type: "date" },
        ],
        rows: orders.map((o) => ({
          id: o.id,
          code: o.code,
          customer_name: o.customer?.name ?? "Khách lẻ",
          customer_phone: o.customer?.phone ?? "—",
          status: o.status,
          production_status: o.production_status,
          total_vnd: Number(o.total_vnd),
          paid_vnd: Number(o.paid_vnd),
          balance_vnd: Number(o.balance_vnd),
          source: o.source ?? "MANUAL",
          created_at: o.created_at.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "members": {
      const { total, members } = await repo.fetchMemberRecords(orgId, skip, PAGE_SIZE)
      return {
        domain,
        columns: [
          { key: "name", label: "Tên thành viên", type: "text" },
          { key: "email", label: "Email", type: "text" },
          { key: "role_id", label: "Vai trò", type: "badge" },
          { key: "status", label: "Trạng thái", type: "badge" },
          { key: "invited_at", label: "Mời lúc", type: "date" },
          { key: "joined_at", label: "Tham gia lúc", type: "date" },
        ],
        rows: members.map((m) => ({
          id: m.id,
          name: m.user.name,
          email: m.user.email ?? "—",
          role_id: m.role_id,
          status: m.status,
          invited_at: m.invited_at.toISOString(),
          joined_at: m.joined_at?.toISOString() ?? "—",
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "branches": {
      const { total, branches } = await repo.fetchBranchRecords(orgId, skip, PAGE_SIZE)
      return {
        domain,
        columns: [
          { key: "code", label: "Mã chi nhánh", type: "text" },
          { key: "name", label: "Tên chi nhánh", type: "text" },
          { key: "address", label: "Địa chỉ", type: "text" },
          { key: "is_active", label: "Hoạt động", type: "badge" },
          { key: "inventory_count", label: "Tồn kho", type: "number" },
          { key: "created_at", label: "Tạo lúc", type: "date" },
        ],
        rows: branches.map((b) => ({
          id: b.id,
          code: b.code,
          name: b.name,
          address: b.address ?? "—",
          is_active: b.is_active ? "Hoạt động" : "Tạm dừng",
          inventory_count: b._count.inventory,
          created_at: b.created_at.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "customers": {
      const { total, customers } = await repo.fetchCustomerRecords(orgId, skip, PAGE_SIZE)
      return {
        domain,
        columns: [
          { key: "code", label: "Mã KH", type: "text" },
          { key: "name", label: "Tên khách hàng", type: "text" },
          { key: "phone", label: "SĐT", type: "text" },
          { key: "email", label: "Email", type: "text" },
          { key: "tier", label: "Hạng", type: "badge" },
          { key: "total_spent", label: "Tổng chi (VNĐ)", type: "money" },
          { key: "order_count", label: "Số đơn", type: "number" },
          { key: "address", label: "Địa chỉ", type: "text" },
          { key: "created_at", label: "Tạo lúc", type: "date" },
        ],
        rows: customers.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          phone: c.phone ?? "—",
          email: c.email ?? "—",
          tier: c.tier,
          total_spent: Number(c.total_spent),
          order_count: c.order_count,
          address: c.address ?? "—",
          created_at: c.created_at.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "jobs": {
      const { total, jobs } = await repo.fetchJobRecords(orgId, skip, PAGE_SIZE)
      return {
        domain,
        columns: [
          { key: "feature", label: "Tính năng AI", type: "text" },
          { key: "status", label: "Trạng thái", type: "badge" },
          { key: "stage", label: "Giai đoạn", type: "text" },
          { key: "result", label: "Kết quả", type: "badge" },
          { key: "attempts", label: "Số lần thử", type: "number" },
          { key: "duration_s", label: "Thời gian (s)", type: "number" },
          { key: "created_at", label: "Tạo lúc", type: "date" },
        ],
        rows: jobs.map((j) => ({
          id: j.id,
          feature: j.feature,
          status: j.status,
          stage: j.stage ?? "—",
          result: j.result ?? "—",
          attempts: j.attempts,
          duration_s:
            j.started_at && j.completed_at
              ? Math.round(
                  (j.completed_at.getTime() - j.started_at.getTime()) / 1000
                )
              : "—",
          created_at: j.created_at.toISOString(),
        })),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }

    case "spreadsheets": {
      const exp = Date.now() + 86_400_000 // 24h
      const { total, files } = await repo.fetchSpreadsheetRecords(orgId, skip, PAGE_SIZE)

      return {
        domain,
        columns: [
          { key: "filename", label: "Tên file gốc", type: "text" },
          { key: "extension", label: "Định dạng", type: "badge" },
          { key: "file_size_formatted", label: "Dung lượng", type: "text" },
          { key: "security_status", label: "Bảo mật & Quét", type: "badge" },
          { key: "download_url", label: "Tải file về", type: "text" },
        ],
        rows: files.map((f) => {
          const params = (f.parameters as Record<string, unknown> | null) ?? {}
          const originalName = typeof params.original_filename === "string" ? params.original_filename : f.storage_key.split("/").pop() ?? f.id
          const ext = f.storage_key.split(".").pop()?.toUpperCase() ?? "XLSX"
          const sized = f as { file_size_bytes?: number | bigint | null; file_size?: number | bigint | null }
          const fileSize = Number(sized.file_size_bytes ?? sized.file_size ?? 0)
          const sizeKb = fileSize ? `${(fileSize / 1024).toFixed(1)} KB` : "—"
          const sig = signStorageUrl(f.storage_key, exp)
          const downloadUrl = `/api/v1/storage/${f.storage_key}?exp=${exp}&sig=${sig}`

          return {
            id: f.id,
            filename: originalName,
            extension: ext,
            file_size_formatted: sizeKb,
            security_status: "Đã quét an toàn",
            download_url: downloadUrl,
          }
        }),
        total,
        page,
        pageSize: PAGE_SIZE,
        totalPages: Math.ceil(total / PAGE_SIZE),
      }
    }
  }
}

/** Xuất toàn bộ records dưới dạng CSV (không phân trang) */
export async function exportPlatformOrgRecordsCsv(
  pctx: PlatformContext,
  orgId: string,
  domain: RecordDomain
): Promise<string> {
  requirePlatformCapability(pctx, "N1")

  // Lấy tất cả, không phân trang (phục vụ export)
  const result = await getPlatformOrgRecords(pctx, orgId, domain, 1)
  const allRows =
    result.total <= PAGE_SIZE
      ? result.rows
      : await (async () => {
          const pages = Math.ceil(result.total / PAGE_SIZE)
          const allData: Record<string, unknown>[] = [...result.rows]
          for (let p = 2; p <= pages; p++) {
            const r = await getPlatformOrgRecords(pctx, orgId, domain, p)
            allData.push(...r.rows)
          }
          return allData
        })()

  const headers = result.columns.map((c) => c.label)
  const keys = result.columns.map((c) => c.key)

  const csvLines = [
    headers.join(","),
    ...allRows.map((row) =>
      keys
        .map((k) => {
          const val = row[k] ?? ""
          const s = String(val).replace(/"/g, '""')
          return s.includes(",") || s.includes("\n") || s.includes('"') ? `"${s}"` : s
        })
        .join(",")
    ),
  ]

  return csvLines.join("\n")
}
