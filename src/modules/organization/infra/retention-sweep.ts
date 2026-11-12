import { prisma } from "@/core/tenancy/infra/prisma"
import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"

import { RETENTION_BATCH_SIZE, RETENTION_MAX_BATCHES, type RetentionCategory } from "../domain/retention-policy"

import { RETENTION_TARGETS as TARGETS, type RetentionTarget as Target } from "./retention-targets"

/** Đếm và thực thi hạn lưu theo bảng của từng loại dữ liệu — bảng và điều kiện ở `./retention-targets.ts`. */
export interface RetentionTableResult { table: string; rows: number }

/** Số dòng quá hạn theo từng bảng của một loại dữ liệu (chỉ đọc). */
export async function countExpired(category: RetentionCategory, cutoff: Date, now: Date): Promise<RetentionTableResult[]> {
  const out: RetentionTableResult[] = []
  for (const t of TARGETS[category]) {
    const [row] = await prisma.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM "${t.table}" WHERE ${t.where}`, cutoff, now)
    out.push({ table: t.table, rows: row?.n ?? 0 })
  }
  return out
}

/** Một lô: chọn tối đa `RETENTION_BATCH_SIZE` khoá rồi xoá hoặc ẩn danh, trong một giao dịch có `purge_reason`. */
async function processBatch(t: Target, cutoff: Date, now: Date): Promise<number> {
  const pick = `SELECT "${t.key}" FROM "${t.table}" WHERE ${t.where} LIMIT ${RETENTION_BATCH_SIZE}`
  const sql = t.set
    ? `UPDATE "${t.table}" SET ${t.set} WHERE "${t.key}" IN (${pick})`
    : `DELETE FROM "${t.table}" WHERE "${t.key}" IN (${pick})`
  return prisma.$transaction(async (tx) => {
    await setPurgeReason(tx, "retention_policy")
    await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '30s'`)
    return tx.$executeRawUnsafe(sql, cutoff, now)
  })
}

/** Xoá / ẩn danh dòng quá hạn theo lô; tối đa `RETENTION_MAX_BATCHES` lô mỗi bảng, phần còn lại để lượt sau. */
export async function enforceExpired(category: RetentionCategory, cutoff: Date, now: Date): Promise<RetentionTableResult[]> {
  const out: RetentionTableResult[] = []
  for (const t of TARGETS[category]) {
    let rows = 0
    for (let batch = 0; batch < RETENTION_MAX_BATCHES; batch++) {
      const n = await processBatch(t, cutoff, now)
      rows += n
      if (n < RETENTION_BATCH_SIZE) break
    }
    out.push({ table: t.table, rows })
  }
  return out
}
