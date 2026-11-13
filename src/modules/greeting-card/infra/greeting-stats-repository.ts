import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { SaleFunnelCounts } from "../domain/sales-funnel"

/** Đếm phễu Thẻ chào theo sale — gom ở DB (groupBy), không kéo từng phiên về. */
export class GreetingStatsRepository {
  constructor(private readonly db = prisma) {}

  /**
   * `paid` = số đơn đã thu ĐỦ; `revenueVnd` = tiền THẬT đã thu (`paid_vnd`, đã trừ hoàn) của đơn chưa huỷ.
   * Bản cũ coi đơn mới cọc là "đã thu" và cộng cả tổng giá trị đơn. `saleId` = chỉ số của một sale.
   */
  async countFunnelBySale(ctx: TenantContext, since: Date, saleId: string | null = null): Promise<SaleFunnelCounts[]> {
    const groups = await this.db.greeting_sessions.groupBy({
      by: ["sale_id"],
      where: scopedWhere(ctx, { created_at: { gte: since }, ...(saleId ? { sale_id: saleId } : {}) }),
      _count: { _all: true, opened_at: true, selected_at: true, order_id: true },
    })

    // Đơn đã thu tiền: nối đơn → phiên nguồn → sale
    const paidOrders = await this.db.orders.findMany({
      where: scopedWhere(ctx, {
        source: "BROCHURE", ...branchScopedWhere(ctx),
        NOT: { status: "CANCELLED" as const },
        paid_vnd: { gt: 0 },
        created_at: { gte: since },
      }),
      select: { source_session_id: true, total_vnd: true, paid_vnd: true },
      take: 10_000,
    })
    const sessionIds = paidOrders.map((o) => o.source_session_id).filter((id): id is string => !!id)
    const saleOfSession = new Map<string, string>()
    if (sessionIds.length > 0) {
      const rows = await this.db.greeting_sessions.findMany({
        where: scopedWhere(ctx, { id: { in: sessionIds } }),
        select: { id: true, sale_id: true },
      })
      for (const r of rows) saleOfSession.set(r.id, r.sale_id)
    }
    const paid = new Map<string, { count: number; revenue: number }>()
    for (const o of paidOrders) {
      const sale = o.source_session_id ? saleOfSession.get(o.source_session_id) : undefined
      if (!sale) continue
      const cur = paid.get(sale) ?? { count: 0, revenue: 0 }
      const total = Number(o.total_vnd)
      const collected = Number(o.paid_vnd)
      if (total > 0 && collected >= total) cur.count += 1
      cur.revenue += collected
      paid.set(sale, cur)
    }

    return groups.map((g) => ({
      saleId: g.sale_id,
      sent: g._count._all,
      opened: g._count.opened_at,
      selected: g._count.selected_at,
      ordered: g._count.order_id,
      paid: paid.get(g.sale_id)?.count ?? 0,
      revenueVnd: paid.get(g.sale_id)?.revenue ?? 0,
    }))
  }

  /** Tên hiển thị nhân viên — chỉ thành viên của chính tổ chức. */
  async memberNames(ctx: TenantContext, userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    if (userIds.length === 0) return map
    const members = await this.db.memberships.findMany({
      where: scopedWhere(ctx, { user_id: { in: userIds } }),
      select: { user: { select: { id: true, name: true, email: true } } },
    })
    for (const m of members) map.set(m.user.id, m.user.name?.trim() || m.user.email.split("@")[0] || "Nhân viên")
    return map
  }
}

let _greetingStatsRepositorySingleton: GreetingStatsRepository | null = null
export function getGreetingStatsRepository(): GreetingStatsRepository {
  if (!_greetingStatsRepositorySingleton) _greetingStatsRepositorySingleton = new GreetingStatsRepository()
  return _greetingStatsRepositorySingleton
}
