import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { conflict, notFound } from "@/core/http/errors"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { upsertOrderRecipient } from "@/modules/orders/infra/order-recipient-repository"
import { applyVat, isVatRate, DEFAULT_VAT_RATE, subtotalOf, vatChangeBlocker, type VatChange, type VatInvoiceInfo } from "../domain/order-vat"

export interface OrderVatView extends VatInvoiceInfo {
  orderId: string
  vatEnabled: boolean
  vatRate: number
  vatAmountVnd: number
  subtotalVnd: number
  totalVnd: number
  paidVnd: number
  balanceVnd: number
}

const VAT_INCLUDE = { recipient: { select: { vat_company_name: true, vat_tax_code: true, vat_company_address: true, vat_email: true } } } as const
type OrderRow = NonNullable<Awaited<ReturnType<typeof prisma.orders.findFirst<{ where: { id: string }; include: typeof VAT_INCLUDE }>>>>

function toView(o: OrderRow): OrderVatView {
  const totalVnd = Number(o.total_vnd)
  const vatAmountVnd = Number(o.vat_amount_vnd)
  const buyer = o.recipient ?? { vat_company_name: null, vat_tax_code: null, vat_company_address: null, vat_email: null } // P-3c
  return {
    orderId: o.id,
    vatEnabled: o.vat_enabled,
    vatRate: isVatRate(o.vat_rate) ? o.vat_rate : DEFAULT_VAT_RATE,
    vatAmountVnd,
    subtotalVnd: subtotalOf({ totalVnd, vatAmountVnd }),
    totalVnd,
    paidVnd: Number(o.paid_vnd),
    balanceVnd: Number(o.balance_vnd),
    companyName: buyer.vat_company_name,
    taxCode: buyer.vat_tax_code,
    companyAddress: buyer.vat_company_address,
    email: buyer.vat_email,
  }
}

/** Hoá đơn VAT trên đơn Thẻ chào — đổi tổng tiền có khoá lạc quan theo tổng/đã thu đọc được, có audit log. */
export class OrderVatRepository {
  constructor(private readonly db = prisma) {}

  private async load(ctx: TenantContext, orderId: string) {
    const order = await this.db.orders.findFirst({ where: scopedWhere(ctx, { id: orderId, source: "BROCHURE" }), include: VAT_INCLUDE })
    if (!order) throw notFound()
    return order
  }

  async get(ctx: TenantContext, orderId: string): Promise<OrderVatView> {
    return toView(await this.load(ctx, orderId))
  }

  async set(ctx: TenantContext, orderId: string, change: VatChange, info: VatInvoiceInfo): Promise<OrderVatView> {
    const order = await this.load(ctx, orderId)
    const state = {
      status: order.status,
      totalVnd: Number(order.total_vnd),
      paidVnd: Number(order.paid_vnd),
      vatAmountVnd: Number(order.vat_amount_vnd),
    }
    const blocker = vatChangeBlocker(state, change)
    if (blocker) throw conflict(blocker)
    const next = applyVat(state, change)

    return this.db.$transaction(async (tx) => {
      const moved = await tx.orders.updateMany({
        where: { id: order.id, organization_id: ctx.organizationId, total_vnd: order.total_vnd, paid_vnd: order.paid_vnd },
        data: {
          vat_enabled: change.enabled,
          vat_rate: change.rate,
          vat_amount_vnd: next.vatAmountVnd,
          total_vnd: next.totalVnd,
          balance_vnd: next.balanceVnd,
        },
      })
      if (moved.count === 0) throw conflict("Đơn hàng vừa thay đổi, vui lòng tải lại")
      await upsertOrderRecipient(tx, ctx.organizationId, order.id, {
        vat: { vat_company_name: info.companyName, vat_tax_code: info.taxCode, vat_company_address: info.companyAddress, vat_email: info.email },
      }) // P-3c: bên mua hoá đơn chỉ ở order_recipients
      await recordAuditLog(
        ctx,
        {
          action: "greeting_card.order.vat",
          entityType: "order",
          entityId: order.id,
          before: { vatEnabled: order.vat_enabled, vatRate: order.vat_rate, vatAmountVnd: state.vatAmountVnd, totalVnd: state.totalVnd },
          after: { vatEnabled: change.enabled, vatRate: change.rate, vatAmountVnd: next.vatAmountVnd, totalVnd: next.totalVnd },
        },
        tx
      )
      const updated = await tx.orders.findFirstOrThrow({ where: { id: order.id, organization_id: ctx.organizationId }, include: VAT_INCLUDE })
      return toView(updated)
    })
  }
}

let _orderVatRepositorySingleton: OrderVatRepository | null = null
export function getOrderVatRepository(): OrderVatRepository {
  if (!_orderVatRepositorySingleton) _orderVatRepositorySingleton = new OrderVatRepository()
  return _orderVatRepositorySingleton
}
