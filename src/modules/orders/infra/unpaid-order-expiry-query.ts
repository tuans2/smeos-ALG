import { prisma } from "@/core/tenancy/infra/prisma"
import { Prisma, type PrismaClient } from "@/generated/prisma/client"
import {
  hasLikelyUnmatchedPayment,
  parseUnpaidExpiryPolicy,
  stockHoldCutoff,
  UNPAID_EXPIRY_MIN_HOURS,
  UNPAID_EXPIRY_SOURCES,
  unpaidExpiryCutoff,
} from "../domain/unpaid-order-expiry"

export interface UnpaidOrderCandidate {
  organizationId: string
  orderId: string
}

/** Đơn catalog / landing còn "Nháp", chưa thu đồng nào, đã có giá (đơn chờ báo giá không huỷ), chưa vào Điều phối. */
const unpaidPublicDraft = {
  status: "DRAFT" as const,
  source: { in: [...UNPAID_EXPIRY_SOURCES] },
  paid_vnd: 0,
  total_vnd: { gt: 0 },
  coordination: { is: null },
}

/** Đơn có ít nhất một dòng đã trừ tồn lúc đặt (dấu `order_items.metadata.stock`, `order-stock.ts`). */
const holdsStock = { items: { some: { metadata: { path: ["stock", "inventoryId"], not: Prisma.AnyNull } } } }

/**
 * Đơn đến hạn tự huỷ, toàn hệ thống (lượt quét chạy quyền hệ thống), theo chính sách từng tổ chức:
 * - đơn đang giữ tồn: mặc định bật, sau 2 giờ (PO 12/11/2026, audit BL-26) — vì vậy xét mọi tổ chức có đơn ứng viên;
 * - đơn còn lại: chỉ tổ chức đã bật công tắc, sau số giờ đã đặt (UJ-12).
 * Bỏ qua đơn có giao dịch ngân hàng chưa khớp đúng số tiền, đến sau lúc đặt (khách có thể đã chuyển khoản).
 */
export async function listExpiredUnpaidOrders(now: Date, limit: number, db: PrismaClient = prisma): Promise<UnpaidOrderCandidate[]> {
  const earliest = new Date(now.getTime() - UNPAID_EXPIRY_MIN_HOURS * 3_600_000)
  const orgIds = await db.orders.groupBy({
    by: ["organization_id"],
    where: { ...unpaidPublicDraft, created_at: { lt: earliest } },
    orderBy: { organization_id: "asc" },
  })
  if (orgIds.length === 0) return []
  const orgs = await db.organizations.findMany({
    where: { id: { in: orgIds.map((o) => o.organization_id) } },
    select: { id: true, settings: true },
  })
  const out: UnpaidOrderCandidate[] = []
  for (const org of orgs) {
    if (out.length >= limit) break
    const policy = parseUnpaidExpiryPolicy(org.settings as Record<string, unknown> | null)
    const stockCutoff = stockHoldCutoff(policy, now)
    const due: Prisma.ordersWhereInput[] = []
    if (stockCutoff) due.push({ ...holdsStock, created_at: { lt: stockCutoff } })
    if (policy.enabled) due.push({ created_at: { lt: unpaidExpiryCutoff(policy, now) } })
    if (due.length === 0) continue
    const rows = await db.orders.findMany({
      where: { organization_id: org.id, ...unpaidPublicDraft, OR: due },
      select: { id: true, total_vnd: true, created_at: true },
      orderBy: { created_at: "asc" },
      take: limit - out.length,
    })
    if (rows.length === 0) continue
    const unmatched = await db.greeting_payment_events.findMany({
      where: {
        organization_id: org.id,
        status: "UNMATCHED",
        order_id: null,
        amount_vnd: { in: [...new Set(rows.map((r) => Number(r.total_vnd)))] },
        created_at: { gte: rows[0]!.created_at },
      },
      select: { amount_vnd: true, created_at: true },
    })
    const events = unmatched.map((e) => ({ amountVnd: Number(e.amount_vnd), at: e.created_at }))
    for (const r of rows) {
      if (hasLikelyUnmatchedPayment({ totalVnd: Number(r.total_vnd), createdAt: r.created_at }, events)) continue
      out.push({ organizationId: org.id, orderId: r.id })
    }
  }
  return out
}
