import { Prisma } from "@/generated/prisma/client"
import type { generation_jobs } from "./entities"
import type { DbClient } from "./db-client"

/**
 * Job còn credit phải hoàn, mọi tổ chức (bộ quét hệ thống — không `scopedWhere`). Diện hoàn khớp `lyDoHoanCredit`
 * (`usage/domain/refund-policy.ts`): bị huỷ, lỗi, hoặc Guard từ chối. Chỉ lấy job mà **lượt hiện tại** (các dòng `usage`
 * sau dòng `REFUNDED` cuối) còn giữ credit > 0 — đúng điều kiện `creditLuotHienTai > 0` của `refundJob`.
 *
 * Trước đây lấy 200 job cũ nhất khớp diện hoàn mà không loại job đã hoàn (hoặc job dùng thử 0 credit): khi đã có hơn
 * 200 job như vậy, job mới không bao giờ tới lượt (audit BL-32, cùng lớp lỗi BL-09).
 */
export async function listRefundableJobs(db: DbClient, limit: number): Promise<generation_jobs[]> {
  const ids = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT j.id
    FROM generation_jobs j
    WHERE (j.status IN ('CANCELLED', 'FAILED') OR (j.status = 'COMPLETED' AND j.result = 'REJECTED'))
      AND (
        SELECT COALESCE(SUM(u.cost_credit), 0)
        FROM usage u
        WHERE u.job_id = j.id
          AND u.created_at > COALESCE(
            (SELECT MAX(r.created_at) FROM usage r WHERE r.job_id = j.id AND r.status = 'REFUNDED'),
            '-infinity'::timestamptz
          )
      ) > 0
    ORDER BY j.created_at ASC, j.id ASC
    LIMIT ${limit}
  `)
  if (ids.length === 0) return []
  const rows = await db.generation_jobs.findMany({ where: { id: { in: ids.map((r) => r.id) } } })
  const order = new Map(ids.map((r, i) => [r.id, i]))
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
