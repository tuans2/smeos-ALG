import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

import { tableChecksum, TENANT_PACKAGE_FORMAT, type Row, type TenantPackage } from "./tenant-export"
import { foreignKeyColumns, schemaVersion, TRANSFER_SOURCES } from "./tenant-transfer-sources"

/**
 * Nhập gói xuất của một tổ chức (ADR-016 D-S3, bước S-2) vào CSDL cùng phiên bản schema, một giao dịch. Từ chối khi:
 * sai định dạng, khác phiên bản schema, checksum lệch, tổ chức đã có ở CSDL đích. Thứ tự cha trước con; khoá ngoại tạo
 * vòng (vd. đơn ↔ lead) hoặc tự trỏ: ghi NULL trước, điền lại sau khi mọi bảng đã nhập. Người dùng đã có (cùng id) giữ
 * nguyên; liên kết tới tổ chức không có ở CSDL đích bị bỏ qua (báo trong kết quả).
 */
export interface ImportResult { inserted: Array<{ table: string; rows: number }>; skippedLinks: number }

type Tx = Prisma.TransactionClient
const SOURCE_TABLES = new Set(TRANSFER_SOURCES.map((s) => s.table))

export function verifyPackage(pkg: TenantPackage): string | null {
  if (pkg.format !== TENANT_PACKAGE_FORMAT || pkg.version !== 1) return "Gói không đúng định dạng xuất tổ chức"
  for (const [table, rows] of Object.entries(pkg.tables)) {
    if (!SOURCE_TABLES.has(table)) return `Gói có bảng lạ: ${table}`
    if (tableChecksum(rows) !== pkg.checksums[table]) return `Checksum bảng ${table} không khớp — gói bị sửa hoặc hỏng`
  }
  return null
}

async function primaryKey(tx: Tx, table: string): Promise<string[]> {
  const rows = await tx.$queryRawUnsafe<Array<{ col: string }>>(
    `SELECT a.attname AS col FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
     WHERE i.indrelid = $1::regclass AND i.indisprimary`, `"${table}"`)
  return rows.map((r) => r.col)
}

/** Lệnh chèn: `users` bỏ qua id đã có; `organization_links` chỉ khi cả hai tổ chức có mặt. */
function insertSql(table: string): string {
  const src = `jsonb_populate_recordset(NULL::"${table}", $1::jsonb) r`
  if (table === "users") return `INSERT INTO "users" SELECT r.* FROM ${src} WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u.id = r.id)`
  if (table === "organization_links") {
    return `INSERT INTO "organization_links" SELECT r.* FROM ${src}
      WHERE r.parent_org_id IN (SELECT id FROM "organizations") AND r.child_org_id IN (SELECT id FROM "organizations")`
  }
  return `INSERT INTO "${table}" SELECT r.* FROM ${src}`
}

export async function importTenant(pkg: TenantPackage): Promise<ImportResult> {
  const bad = verifyPackage(pkg)
  if (bad) throw new Error(bad)
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '30s'`)
      const target = await schemaVersion(tx)
      if (target !== pkg.schemaVersion) throw new Error(`Khác phiên bản schema: gói ${pkg.schemaVersion}, CSDL đích ${target}`)
      const [exists] = await tx.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "organizations" WHERE id = $1`, pkg.organizationId)
      if ((exists?.n ?? 0) > 0) throw new Error("Tổ chức đã có ở CSDL đích — xoá trước (khôi phục riêng) hoặc nhập vào CSDL khác")

      const fks = await foreignKeyColumns(tx)
      const loaded = new Set<string>()
      const deferred: Array<{ table: string; column: string; rows: Row[] }> = []
      const inserted: ImportResult["inserted"] = []
      let skippedLinks = 0
      for (const { table } of TRANSFER_SOURCES) {
        const rows = pkg.tables[table] ?? []
        if (rows.length > 0) {
          const later = fks.filter((f) => f.table === table && SOURCE_TABLES.has(f.references) && (f.references === table || !loaded.has(f.references)))
          const blocked = later.find((f) => !f.nullable)
          if (blocked) throw new Error(`Không nhập được ${table}.${blocked.column}: trỏ tới ${blocked.references} chưa nhập`)
          const columns = [...new Set(later.map((f) => f.column))]
          const first = columns.length ? rows.map((r) => ({ ...r, ...Object.fromEntries(columns.map((c) => [c, null])) })) : rows
          const n = await tx.$executeRawUnsafe(insertSql(table), JSON.stringify(first))
          if (table === "organization_links") skippedLinks = rows.length - n
          inserted.push({ table, rows: n })
          for (const column of columns) deferred.push({ table, column, rows })
        }
        loaded.add(table)
      }
      for (const { table, column, rows } of deferred) {
        const pk = await primaryKey(tx, table)
        const on = pk.map((c) => `x."${c}" = r."${c}"`).join(" AND ")
        await tx.$executeRawUnsafe(
          `UPDATE "${table}" x SET "${column}" = r."${column}" FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb) r WHERE ${on} AND r."${column}" IS NOT NULL`,
          JSON.stringify(rows),
        )
      }
      return { inserted, skippedLinks }
    },
    { timeout: 30 * 60_000, maxWait: 30_000 },
  )
}
