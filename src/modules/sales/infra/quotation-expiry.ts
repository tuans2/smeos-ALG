import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ExpiredQuotationBatch {
  count: number
  /** Lead đang "Đã báo giá" của các báo giá vừa hết hạn — lượt quét đưa về "Theo dõi" (audit User Journey L2). */
  leadsToFollowUp: { organizationId: string; leadId: string }[]
}

/**
 * Đánh `EXPIRED` các báo giá nháp/đã gửi quá ngày hiệu lực — toàn hệ thống, trong lượt quét nội bộ (quyền hệ
 * thống). Cùng luật với `isQuotationExpired`: báo giá khách đã đồng ý, đã từ chối, đã tạo đơn không bị đụng.
 * Mỗi lượt tối đa `limit` dòng; lệnh ghi có điều kiện trạng thái nên không đè báo giá vừa được xử lý.
 */
export async function expireOverdueQuotationRows(now: Date, limit: number, db: DbClient = prisma): Promise<ExpiredQuotationBatch> {
  const due = await db.quotations.findMany({
    where: { status: { in: ["DRAFT", "SENT"] }, valid_until: { lt: now } },
    select: { id: true },
    orderBy: { valid_until: "asc" },
    take: limit,
  })
  if (due.length === 0) return { count: 0, leadsToFollowUp: [] }
  const ids = due.map((q) => q.id)
  const res = await db.quotations.updateMany({
    where: { id: { in: ids }, status: { in: ["DRAFT", "SENT"] }, valid_until: { lt: now } },
    data: { status: "EXPIRED" },
  })
  const expired = await db.quotations.findMany({
    where: { id: { in: ids }, status: "EXPIRED", lead: { is: { status: "QUOTATION_SENT" } } },
    select: { organization_id: true, lead_id: true },
  })
  const seen = new Set<string>()
  const leadsToFollowUp: ExpiredQuotationBatch["leadsToFollowUp"] = []
  for (const q of expired) {
    if (!q.lead_id || seen.has(q.lead_id)) continue
    seen.add(q.lead_id)
    leadsToFollowUp.push({ organizationId: q.organization_id, leadId: q.lead_id })
  }
  return { count: res.count, leadsToFollowUp }
}
