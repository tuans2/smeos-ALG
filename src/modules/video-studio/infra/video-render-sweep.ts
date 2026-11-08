import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

type DbClient = PrismaClient | Prisma.TransactionClient

/** Lời báo trên video bị đánh lỗi vì không còn tác vụ dựng nào chạy cho nó. */
export const ORPHANED_RENDER_MESSAGE = "Dựng video bị gián đoạn — vui lòng bấm dựng lại."

/**
 * Video kẹt `RENDERING` vĩnh viễn (audit hành trình V1, gói UJ-03): worker chết giữa chừng thì bộ quét job treo
 * chỉ đánh `generation_jobs = FAILED`; đưa vào hàng đợi lỗi thì không có job nào. Cả hai trường hợp, `video_jobs`
 * giữ `RENDERING` và nút dựng lại bị chặn ("đang thực thi").
 *
 * Đánh `FAILED` mọi video `RENDERING` đã quá `staleMs` mà KHÔNG còn job `PENDING/PROCESSING` nào trỏ tới nó
 * (worker đọc `payload.videoJobId`, vắng thì dùng chính id job). Chạy toàn hệ thống trong lượt quét nội bộ
 * (quyền hệ thống), một câu lệnh có điều kiện — không ghi đè video worker vừa ghi xong.
 */
export async function failOrphanedVideoRenders(now: Date, staleMs: number, db: DbClient = prisma): Promise<number> {
  const threshold = new Date(now.getTime() - staleMs)
  return db.$executeRaw`
    UPDATE "video_jobs" AS v
    SET "stage" = 'FAILED', "error_message" = ${ORPHANED_RENDER_MESSAGE}, "updated_at" = ${now}
    WHERE v."stage" = 'RENDERING'
      AND v."updated_at" < ${threshold}
      AND NOT EXISTS (
        SELECT 1 FROM "generation_jobs" AS g
        WHERE g."organization_id" = v."organization_id"
          AND g."status" IN ('PENDING', 'PROCESSING')
          AND (g."payload"->>'videoJobId' = v."id" OR g."id" = v."id")
      )`
}
