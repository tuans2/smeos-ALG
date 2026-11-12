import { prisma } from "@/core/tenancy/infra/prisma"

import type { TableSize } from "../db-growth"

/** Số dòng ước tính (`pg_class.reltuples`, cập nhật khi ANALYZE) và dung lượng gồm index + TOAST của bảng `public`. */
export async function readTableSizes(): Promise<TableSize[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ t: string; r: number; b: number }>>(`
    SELECT c.relname AS t, GREATEST(c.reltuples, 0)::float8 AS r, pg_total_relation_size(c.oid)::float8 AS b
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
    ORDER BY b DESC`)
  return rows.map((x) => ({ table: x.t, rows: Math.round(x.r), bytes: x.b }))
}
