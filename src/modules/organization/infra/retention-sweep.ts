import { prisma } from "@/core/tenancy/infra/prisma"
import { setPurgeReason } from "@/core/tenancy/infra/purge-reason"

import { RETENTION_BATCH_SIZE, RETENTION_MAX_BATCHES, type RetentionCategory } from "../domain/retention-policy"

/**
 * Bảng và điều kiện "quá hạn" của từng loại dữ liệu (ADR-014 D-P4, bước P-6a) — luật ở `../domain/retention-policy.ts`.
 * Tên bảng, cột viết cố định ở đây, không lấy từ người gọi; mốc cắt và thời điểm chạy đi qua tham số (`$1` = mốc cắt,
 * `$2` = bây giờ). Dòng của tổ chức đang legal hold luôn bị bỏ qua.
 */
const NOT_ON_HOLD = `organization_id NOT IN (SELECT id FROM "organizations" WHERE legal_hold_until > $2)`
const DONE_ORDERS = `SELECT id FROM "orders" WHERE status IN ('COMPLETED', 'CANCELLED') AND updated_at < $1`

interface Target {
  table: string
  /** Khoá chính — chọn lô theo khoá rồi mới xoá/sửa, để mỗi giao dịch ngắn. */
  key: string
  where: string
  /** `SET …` khi ẩn danh; không có = xoá dòng. */
  set?: string
}

const olderThan = (table: string): Target => ({ table, key: "id", where: `created_at < $1 AND ${NOT_ON_HOLD}` })

const TARGETS: Record<RetentionCategory, readonly Target[]> = {
  technical_logs: [olderThan("job_events"), olderThan("notification_inbox"), olderThan("link_events"), olderThan("greeting_catalog_events")],
  audit_logs: [
    olderThan("audit_logs"),
    olderThan("platform_access_logs"),
    {
      table: "platform_audit_logs",
      key: "id",
      // Không có `organization_id`: giữ nhật ký nền tảng về một tổ chức đang legal hold.
      where: `created_at < $1 AND NOT (entity_type = 'organizations' AND entity_id IN (SELECT id FROM "organizations" WHERE legal_hold_until > $2))`,
    },
  ],
  delivery_info: [
    {
      table: "order_recipients",
      key: "order_id",
      where: `(recipient_name IS NOT NULL OR recipient_phone IS NOT NULL OR address_line IS NOT NULL OR address_parts IS NOT NULL)
        AND ${NOT_ON_HOLD} AND order_id IN (${DONE_ORDERS})`,
      // Giữ thông tin hoá đơn VAT (chứng từ ghi sổ, hạn 10 năm).
      set: `recipient_name = NULL, recipient_phone = NULL, address_line = NULL, address_parts = NULL`,
    },
    {
      table: "orders",
      key: "id",
      where: `delivery_address IS NOT NULL AND ${NOT_ON_HOLD} AND id IN (${DONE_ORDERS})`,
      set: `delivery_address = NULL`,
    },
  ],
}

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
