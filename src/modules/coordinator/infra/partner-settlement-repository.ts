import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import type { Prisma } from "@/generated/prisma/client"
import type { StatementLine } from "../domain/partner-payout"
import type { DbClient } from "./transaction"

/** Một bảng kê có trần số đơn — kỳ tối đa 92 ngày, đối tác không làm quá số này. */
export const MAX_STATEMENT_ORDERS = 1000

const SETTLEMENT_SELECT = {
  id: true, partner_id: true, period_from: true, period_to: true, status: true, order_count: true, total_payout_vnd: true,
  note: true, created_by: true, created_at: true, reconciled_by: true, reconciled_at: true, paid_by: true, paid_at: true,
  payment_reference: true,
} as const

export type SettlementRow = Prisma.partner_settlementsGetPayload<{ select: typeof SETTLEMENT_SELECT }>

/** Sổ quyết toán tiền công đối tác (audit BL-22). Mọi truy vấn lọc theo tổ chức của phiên. */
export class PartnerSettlementRepository {
  constructor(private readonly db: DbClient = prisma) {}

  findPartner(ctx: TenantContext, partnerId: string) {
    return this.db.partners.findFirst({ where: scopedWhere(ctx, { id: partnerId }), select: { id: true, name: true, code: true } })
  }

  /** Đơn của đối tác đã đóng trong `[start, endExclusive)`, cũ trước. */
  async closedOrders(ctx: TenantContext, partnerId: string, start: Date, endExclusive: Date): Promise<StatementLine[]> {
    const rows = await this.db.order_coordinations.findMany({
      where: scopedWhere(ctx, { partner_id: partnerId, stage: "COMPLETED" as const, closed_at: { gte: start, lt: endExclusive } }),
      select: { order_id: true, closed_at: true, partner_payout_vnd: true, order: { select: { code: true } } },
      orderBy: [{ closed_at: "asc" }, { order_id: "asc" }],
      take: MAX_STATEMENT_ORDERS,
    })
    return rows.map((r) => ({
      orderId: r.order_id,
      code: r.order.code,
      closedAt: (r.closed_at as Date).toISOString(),
      payoutVnd: r.partner_payout_vnd === null ? null : Number(r.partner_payout_vnd),
    }))
  }

  list(ctx: TenantContext, partnerId: string, take = 24) {
    return this.db.partner_settlements.findMany({
      where: scopedWhere(ctx, { partner_id: partnerId }),
      select: SETTLEMENT_SELECT,
      orderBy: { period_from: "desc" },
      take,
    })
  }

  /** Sổ của đối tác có chung ít nhất một ngày với kỳ `[from, to]`. */
  findOverlapping(ctx: TenantContext, partnerId: string, from: Date, to: Date) {
    return this.db.partner_settlements.findFirst({
      where: scopedWhere(ctx, { partner_id: partnerId, period_from: { lte: to }, period_to: { gte: from } }),
      select: { id: true },
    })
  }

  create(ctx: TenantContext, data: { partnerId: string; from: Date; to: Date; lines: StatementLine[]; totalVnd: number; note: string | null }) {
    return this.db.partner_settlements.create({
      data: {
        organization_id: ctx.organizationId, partner_id: data.partnerId, period_from: data.from, period_to: data.to,
        order_count: data.lines.length, total_payout_vnd: data.totalVnd, items: data.lines as unknown as Prisma.InputJsonValue,
        note: data.note, created_by: ctx.userId,
      },
      select: SETTLEMENT_SELECT,
    })
  }

  find(ctx: TenantContext, id: string) {
    return this.db.partner_settlements.findFirst({ where: scopedWhere(ctx, { id }), select: { ...SETTLEMENT_SELECT, items: true } })
  }

  /** Đổi trạng thái chỉ khi còn ở trạng thái đã đọc — hai người bấm cùng lúc chỉ một người ghi. */
  async advance(ctx: TenantContext, id: string, from: string, data: Prisma.partner_settlementsUpdateManyMutationInput): Promise<boolean> {
    const n = await this.db.partner_settlements.updateMany({ where: scopedWhere(ctx, { id, status: from }), data })
    return n.count > 0
  }
}
