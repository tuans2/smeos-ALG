import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Đánh `EXPIRED` các báo giá nháp/đã gửi quá ngày hiệu lực — toàn hệ thống, trong lượt quét nội bộ (quyền hệ
 * thống). Cùng luật với `isQuotationExpired`: báo giá khách đã đồng ý, đã từ chối, đã tạo đơn không bị đụng.
 * Mỗi lượt tối đa `limit` dòng; lệnh ghi có điều kiện trạng thái nên không đè báo giá vừa được xử lý.
 */
export async function expireOverdueQuotationRows(now: Date, limit: number, db: DbClient = prisma): Promise<number> {
  const due = await db.quotations.findMany({
    where: { status: { in: ["DRAFT", "SENT"] }, valid_until: { lt: now } },
    select: { id: true },
    orderBy: { valid_until: "asc" },
    take: limit,
  })
  if (due.length === 0) return 0
  const res = await db.quotations.updateMany({
    where: { id: { in: due.map((q) => q.id) }, status: { in: ["DRAFT", "SENT"] }, valid_until: { lt: now } },
    data: { status: "EXPIRED" },
  })
  return res.count
}
