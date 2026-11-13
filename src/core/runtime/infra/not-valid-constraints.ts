import { prisma } from "@/core/tenancy/infra/prisma"

type Db = Pick<typeof prisma, "$queryRawUnsafe" | "$executeRawUnsafe">

/** Một khoá còn `NOT VALID` (chặn dữ liệu mới nhưng chưa kiểm dữ liệu cũ) và số dòng cũ đang vi phạm. */
export interface NotValidConstraint {
  readonly table: string
  readonly name: string
  readonly kind: "FOREIGN KEY" | "CHECK"
  readonly violations: number
}

interface Row {
  table_name: string
  name: string
  contype: "f" | "c"
  parent: string | null
  cols: string[]
  parent_cols: string[] | null
  def: string
}

const LIST_SQL = `
  SELECT c.conrelid::regclass::text AS table_name, c.conname::text AS name, c.contype::text AS contype,
         c.confrelid::regclass::text AS parent,
         ARRAY(SELECT quote_ident(a.attname) FROM unnest(c.conkey) WITH ORDINALITY k(n, i)
               JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.n ORDER BY k.i) AS cols,
         CASE WHEN c.contype = 'f' THEN ARRAY(SELECT quote_ident(a.attname) FROM unnest(c.confkey) WITH ORDINALITY k(n, i)
               JOIN pg_attribute a ON a.attrelid = c.confrelid AND a.attnum = k.n ORDER BY k.i) END AS parent_cols,
         pg_get_constraintdef(c.oid) AS def
  FROM pg_constraint c
  WHERE NOT c.convalidated AND c.contype IN ('f', 'c') AND c.connamespace = 'public'::regnamespace
  ORDER BY 1, 2`

/** Câu đếm dòng vi phạm: khoá ngoại theo MATCH SIMPLE (một cột NULL thì không kiểm), CHECK theo biểu thức của khoá. */
function violationSql(row: Row): string {
  if (row.contype === "f") {
    const notNull = row.cols.map((c) => `c.${c} IS NOT NULL`).join(" AND ")
    const join = row.cols.map((c, i) => `p.${row.parent_cols?.[i]} = c.${c}`).join(" AND ")
    return `SELECT count(*)::int AS n FROM ${row.table_name} c WHERE ${notNull} AND NOT EXISTS (SELECT 1 FROM ${row.parent} p WHERE ${join})`
  }
  const expr = row.def.replace(/^CHECK\s+/, "").replace(/\s+NOT VALID$/, "")
  return `SELECT count(*)::int AS n FROM ${row.table_name} WHERE NOT ${expr}`
}

/**
 * Khoá `NOT VALID` còn trong CSDL (VAN_HANH_CAP_NHAT_CSDL.md §7) kèm số dòng vi phạm. Chỉ đọc; không trả dữ liệu dòng.
 * Tên bảng / cột lấy từ `pg_catalog` (`regclass`, `quote_ident`), không từ người gọi.
 */
export async function listNotValidConstraints(db: Db = prisma): Promise<NotValidConstraint[]> {
  const rows = await db.$queryRawUnsafe<Row[]>(LIST_SQL)
  const out: NotValidConstraint[] = []
  for (const row of rows) {
    const [count] = await db.$queryRawUnsafe<Array<{ n: number }>>(violationSql(row))
    out.push({ table: row.table_name, name: row.name, kind: row.contype === "f" ? "FOREIGN KEY" : "CHECK", violations: count?.n ?? 0 })
  }
  return out
}

/** `VALIDATE CONSTRAINT` các khoá không còn dòng vi phạm (khoá chỉ chặn ghi cấu trúc, không chặn đọc/ghi dòng). */
export async function validateCleanConstraints(db: Db = prisma): Promise<string[]> {
  const validated: string[] = []
  for (const c of await listNotValidConstraints(db)) {
    if (c.violations > 0) continue
    await db.$executeRawUnsafe(`ALTER TABLE ${c.table} VALIDATE CONSTRAINT "${c.name.replace(/"/g, '""')}"`)
    validated.push(c.name)
  }
  return validated
}
