import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import { hasActiveOrderShare } from "@/modules/orders/infra/shared-order-access-repository"
import type { SubcontractCardFacts, SubcontractCardSource } from "../use-cases/subcontract-card-views"

/**
 * Đọc trạng thái THẬT của đơn gia công cho thẻ trong phòng trao đổi — cùng nguồn với Thẻ Gia Công, `/cua-hang` và
 * Telegram (`order_coordinations.metadata.subcontract_dispatch`). Không chép trạng thái vào tin nhắn nên không lệch.
 * Chỉ chọn cột vận hành, không đọc tên / SĐT / địa chỉ khách.
 */
export class PrismaSubcontractCardSource implements SubcontractCardSource {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async load(chainOrgId: string, cards: Array<{ orderCode: string; branchCode: string }>): Promise<Map<string, SubcontractCardFacts>> {
    const out = new Map<string, SubcontractCardFacts>()
    if (cards.length === 0) return out
    const codes = [...new Set(cards.map((c) => c.orderCode))]
    const branchCodes = [...new Set(cards.map((c) => c.branchCode))]
    const [orders, branches] = await Promise.all([
      this.prisma.orders.findMany({
        where: { organization_id: chainOrgId, code: { in: codes } },
        select: { id: true, code: true, status: true, production_status: true, delivery_status: true, coordination: { select: { metadata: true } } },
      }),
      this.prisma.branches.findMany({ where: { organization_id: chainOrgId, code: { in: branchCodes } }, select: { code: true, partner_org_id: true } }),
    ])
    const partnerOf = new Map(branches.map((b) => [b.code, b.partner_org_id]))
    const orderOf = new Map(orders.map((o) => [o.code, o]))
    for (const card of cards) {
      const order = orderOf.get(card.orderCode)
      if (!order) continue
      const state = (order.coordination?.metadata as Record<string, unknown> | null | undefined)?.subcontract_dispatch ?? null
      out.set(`${card.orderCode}|${card.branchCode}`, {
        orderStatus: order.status,
        productionStatus: order.production_status,
        deliveryStatus: order.delivery_status,
        state: state as SubcontractCardFacts["state"],
        branchPartnerOrgId: partnerOf.get(card.branchCode) ?? null,
        hasShare: await hasActiveOrderShare(this.prisma, chainOrgId, order.id, card.branchCode),
      })
    }
    return out
  }
}
