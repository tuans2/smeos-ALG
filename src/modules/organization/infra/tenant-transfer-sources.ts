import { TABLES_CHILD_FIRST, TENANT_SCOPED_TABLES } from "@/core/tenancy/generated/tenant-table-registry"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

/**
 * Nguồn dữ liệu của một tổ chức khi xuất / nhập (ADR-016 D-S3, bước S-2) — đọc từ sổ bảng-thuộc-tenant, không gõ tay.
 * Thứ tự cha trước con (đảo `TABLES_CHILD_FIRST`). Ngoài bảng có `organization_id` còn: dòng `organizations`, người dùng
 * là thành viên, trường tự tạo (`field_definitions.owner_organization_id`), liên kết tổ chức, quyết định theo tầng của
 * tổ chức. Bảng nền tảng khác (ngành, năng lực AI…) coi như đã có ở CSDL đích.
 */
export interface TransferSource {
  table: string
  /** Điều kiện chọn dòng, `$1` = organization_id. */
  where: string
}

const TENANT = new Set(TENANT_SCOPED_TABLES)
const EXTRA: Record<string, string> = {
  organizations: `id = $1`,
  users: `id IN (SELECT user_id FROM "memberships" WHERE organization_id = $1)`,
  field_definitions: `owner_organization_id = $1`,
  organization_links: `parent_org_id = $1 OR child_org_id = $1`,
  governance_decisions: `scope = 'org:' || $1`,
}

export const TRANSFER_SOURCES: readonly TransferSource[] = [...TABLES_CHILD_FIRST]
  .reverse()
  .filter((t) => TENANT.has(t) || t in EXTRA)
  .map((table) => ({ table, where: EXTRA[table] ?? `organization_id = $1` }))

type Db = Prisma.TransactionClient | typeof prisma

/** Phiên bản schema = migration cuối đã chạy xong; nhập chỉ nhận gói cùng phiên bản. */
export async function schemaVersion(db: Db = prisma): Promise<string> {
  // CSDL dựng bằng `prisma db push` (CSDL test) không có bảng migration → "unknown" ở cả hai đầu.
  const [has] = await db.$queryRawUnsafe<Array<{ t: string | null }>>(`SELECT to_regclass('public._prisma_migrations')::text AS t`)
  if (!has?.t) return "unknown"
  const [row] = await db.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT migration_name AS name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name DESC LIMIT 1`,
  )
  return row?.name ?? "unknown"
}

export interface ForeignKeyColumn { table: string; references: string; column: string; nullable: boolean }

/** Cột khoá ngoại (trừ `organization_id`) của các bảng chuyển — để nhập vòng phụ thuộc bằng cách điền sau. */
export async function foreignKeyColumns(db: Db = prisma): Promise<ForeignKeyColumn[]> {
  const rows = await db.$queryRawUnsafe<Array<{ tbl: string; ref: string; col: string; notnull: boolean }>>(`
    SELECT c.conrelid::regclass::text AS tbl, c.confrelid::regclass::text AS ref, a.attname AS col, a.attnotnull AS notnull
    FROM pg_constraint c
    JOIN LATERAL unnest(c.conkey) AS k(attnum) ON true
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace AND a.attname <> 'organization_id'`)
  const strip = (name: string) => name.replace(/^"|"$/g, "")
  return rows.map((r) => ({ table: strip(r.tbl), references: strip(r.ref), column: r.col, nullable: !r.notnull }))
}
