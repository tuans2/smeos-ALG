/**
 * Hạ tầng phụ cho cổng nhận đơn (`ingestOrder`) — tách khỏi `order-repository.ts` để giữ trần 350 dòng.
 * `docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §3.3, §4.
 */

import { conflict, notFound } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { OPEN_LEAD_STATUSES } from "@/modules/acquisition/domain/lead-rules"

type DbClient = PrismaClient | Prisma.TransactionClient

/**
 * Lead → đơn, gọi TRONG giao dịch tạo đơn: chỉ lead cùng tổ chức (khác tổ chức → 404), chưa thành đơn
 * (đã thành đơn → 409). Lead nhớ đơn đã chuyển thành; CHƯA chuyển `WON` — "Đã chốt" khi đơn ghi nhận tiền đầu
 * hoặc được duyệt giao trước (`markLeadWonForOrder`, audit hành trình L1, gói UJ-13).
 */
export async function linkLeadToOrder(
  tx: Prisma.TransactionClient,
  organizationId: string,
  leadId: string,
  orderId: string,
): Promise<void> {
  const lead = await tx.leads.findFirst({
    where: { id: leadId, organization_id: organizationId },
    select: { id: true, converted_order_id: true },
  })
  if (!lead) throw notFound()
  if (lead.converted_order_id) throw conflict("Khách tiềm năng này đã thành đơn trước đó")
  await tx.leads.update({
    where: { id: lead.id },
    data: { converted_order_id: orderId },
  })
}

/** Lead đang mở gắn với đơn → `WON`. Gọi trong giao dịch chuyển đơn sang Điều phối (tiền về / duyệt giao trước). */
export async function markLeadWonForOrder(tx: Prisma.TransactionClient, organizationId: string, orderId: string): Promise<void> {
  await tx.leads.updateMany({
    where: { organization_id: organizationId, converted_order_id: orderId, status: { in: [...OPEN_LEAD_STATUSES] } },
    data: { status: "WON", status_changed_at: new Date() },
  })
}

/**
 * Đơn bị huỷ → lead gắn với nó trở lại "Theo dõi" và được gắn đơn mới (trước đây lead giữ `WON` mãi, số chuyển
 * đổi bị thổi phồng — audit hành trình L1, gói UJ-13). Điều kiện trong câu lệnh nên gọi lặp lại vô hại.
 */
export async function releaseLeadOfCancelledOrder(organizationId: string, orderId: string, db: DbClient = prisma): Promise<number> {
  const res = await db.leads.updateMany({
    where: { organization_id: organizationId, converted_order_id: orderId, status: { in: ["WON", ...OPEN_LEAD_STATUSES] } },
    data: { converted_order_id: null, status: "FOLLOW_UP", status_changed_at: new Date() },
  })
  return res.count
}

/** Người dùng là thành viên đang hoạt động của tổ chức (kiểm sale phụ trách). */
export async function isActiveOrgMember(organizationId: string, userId: string): Promise<boolean> {
  const n = await prisma.memberships.count({ where: { organization_id: organizationId, user_id: userId, status: "ACTIVE" } })
  return n > 0
}
