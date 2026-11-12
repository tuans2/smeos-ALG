import { createHash } from "node:crypto"

import { prisma } from "@/core/tenancy/infra/prisma"

import { schemaVersion, TRANSFER_SOURCES } from "./tenant-transfer-sources"

/**
 * Xuất toàn bộ dữ liệu của một tổ chức (ADR-016 D-S3, bước S-2). Đọc thô từng bảng (`to_jsonb`) — cột cá nhân giữ nguyên
 * bản mã như trong CSDL, khoá dữ liệu của tổ chức (`tenant_data_keys`) đi kèm, nên CSDL đích phải dùng cùng khoá chủ
 * `PII_ENCRYPTION_KEY`. Gói ghi phiên bản schema, checksum từng bảng, danh sách tệp trong kho (tệp chép riêng). Gói có
 * dữ liệu cá nhân và băm mật khẩu của thành viên: lưu như bản sao lưu.
 */
export const TENANT_PACKAGE_FORMAT = "smeos-tenant-export"

export type Row = Record<string, unknown>

export interface TenantPackage {
  format: typeof TENANT_PACKAGE_FORMAT
  version: 1
  schemaVersion: string
  organizationId: string
  exportedAt: string
  tables: Record<string, Row[]>
  checksums: Record<string, string>
  /** Khoá tệp trong kho của `assets` — chép kèm khi chuyển sang kho khác. */
  files: string[]
}

/** Checksum ổn định của một bảng: dòng sắp theo nội dung JSON (khoá jsonb đã có thứ tự cố định). */
export function tableChecksum(rows: Row[]): string {
  const lines = rows.map((r) => JSON.stringify(r)).sort()
  return createHash("sha256").update(lines.join("\n")).digest("hex")
}

export async function exportTenant(organizationId: string, now: Date): Promise<TenantPackage> {
  const tables: Record<string, Row[]> = {}
  const checksums: Record<string, string> = {}
  for (const { table, where } of TRANSFER_SOURCES) {
    const rows = await prisma.$queryRawUnsafe<Array<{ r: Row }>>(`SELECT to_jsonb(t) AS r FROM "${table}" t WHERE ${where}`, organizationId)
    if (rows.length === 0) continue
    tables[table] = rows.map((x) => x.r)
    checksums[table] = tableChecksum(tables[table])
  }
  if (!tables["organizations"]) throw new Error("Không thấy tổ chức")
  const files = (tables["assets"] ?? []).flatMap((a) => [a["storage_key"], a["thumb_key"]]).filter((k): k is string => typeof k === "string" && k !== "")
  return {
    format: TENANT_PACKAGE_FORMAT, version: 1, schemaVersion: await schemaVersion(), organizationId,
    exportedAt: now.toISOString(), tables, checksums, files: [...new Set(files)].sort(),
  }
}
