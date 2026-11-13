/**
 * Dữ kiện để gợi ý phí gia công cho một đơn: báo giá đã lưu, VAT, dòng hàng, thuộc tính sản phẩm
 * (phí cố định, độ khó, định mức nguyên liệu), ngành và cấu hình phí của cửa hàng.
 * Chỉ đọc trong phạm vi tổ chức của phiên.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import type { CraftFeeOrderFacts, ICraftFeeFactsStore } from "../use-cases/suggest-craft-fee"

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v) || 0)

export class CraftFeeFactsRepository implements ICraftFeeFactsStore {
  constructor(private readonly db = prisma) {}

  async loadFacts(organizationId: string, orderId: string): Promise<CraftFeeOrderFacts | null> {
    const order = await this.db.orders.findFirst({
      where: { id: orderId, organization_id: organizationId },
      select: {
        total_vnd: true,
        vat_amount_vnd: true,
        pricing_rule_ref: true,
        delivery_window: true,
        items: { select: { product_id: true, quantity: true, unit_price_vnd: true, metadata: true } },
        organization: { select: ORG_SETTINGS_SELECT }, // ngành theo cột (ADR-012 T-6c-1)
      },
    })
    if (!order) return null

    const productIds = order.items.map((i) => i.product_id).filter((id): id is string => Boolean(id))
    const products = productIds.length
      ? await this.db.products.findMany({
          where: { id: { in: productIds }, organization_id: organizationId },
          select: { id: true, attributes: true },
        })
      : []
    const attrsById = new Map(products.map((p) => [p.id, (p.attributes as Record<string, unknown> | null) ?? {}]))

    return {
      totalVnd: num(order.total_vnd),
      vatAmountVnd: num(order.vat_amount_vnd),
      pricingRef: (order.pricing_rule_ref as Record<string, unknown> | null) ?? {},
      deliveryWindow: (order.delivery_window as Record<string, unknown> | null) ?? {},
      settings: (withIndustryKey(order.organization).settings as Record<string, unknown> | null) ?? {},
      items: order.items.map((i) => {
        const attrs = (i.product_id && attrsById.get(i.product_id)) || {}
        const meta = (i.metadata as Record<string, unknown> | null) ?? {}
        return {
          quantity: i.quantity,
          unitPriceVnd: num(i.unit_price_vnd),
          productAttributes: attrs,
          bom: attrs.bom ?? meta.bom ?? null,
        }
      }),
    }
  }
}
