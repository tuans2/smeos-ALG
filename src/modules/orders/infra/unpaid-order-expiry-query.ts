import { prisma } from "@/core/tenancy/infra/prisma"
import type { PrismaClient } from "@/generated/prisma/client"
import { parseUnpaidExpiryPolicy, UNPAID_EXPIRY_SETTINGS_KEY, UNPAID_EXPIRY_SOURCES, unpaidExpiryCutoff } from "../domain/unpaid-order-expiry"

export interface UnpaidOrderCandidate {
  organizationId: string
  orderId: string
}

/**
 * Đơn đến hạn tự huỷ, toàn hệ thống (lượt quét chạy quyền hệ thống): chỉ tổ chức đã BẬT công tắc; đơn catalog /
 * landing còn "Nháp", chưa thu đồng nào, đã có giá (đơn chờ báo giá không huỷ), chưa vào Điều phối, quá hạn.
 */
export async function listExpiredUnpaidOrders(now: Date, limit: number, db: PrismaClient = prisma): Promise<UnpaidOrderCandidate[]> {
  const orgs = await db.organizations.findMany({
    where: { settings: { path: [UNPAID_EXPIRY_SETTINGS_KEY, "enabled"], equals: true } },
    select: { id: true, settings: true },
  })
  const out: UnpaidOrderCandidate[] = []
  for (const org of orgs) {
    if (out.length >= limit) break
    const policy = parseUnpaidExpiryPolicy(org.settings as Record<string, unknown> | null)
    if (!policy.enabled) continue
    const rows = await db.orders.findMany({
      where: {
        organization_id: org.id,
        status: "DRAFT",
        source: { in: [...UNPAID_EXPIRY_SOURCES] },
        paid_vnd: 0,
        total_vnd: { gt: 0 },
        coordination: { is: null },
        created_at: { lt: unpaidExpiryCutoff(policy, now) },
      },
      select: { id: true },
      orderBy: { created_at: "asc" },
      take: limit - out.length,
    })
    out.push(...rows.map((r) => ({ organizationId: org.id, orderId: r.id })))
  }
  return out
}
