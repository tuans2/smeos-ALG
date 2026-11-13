import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { isUniqueViolation } from "@/modules/coordinator/infra/transaction"

export type PaymentEventStatus = "RECEIVED" | "MATCHED" | "UNMATCHED" | "IGNORED"

export interface NewPaymentEvent {
  provider: string
  externalId: string
  amountVnd: number
  content: string
  accountNo: string | null
  transactionAt: Date | null
}

/**
 * Tích hợp ngoài của Thẻ chào (khoá webhook ngân hàng, kênh thông báo) +
 * nhật ký giao dịch ngân hàng. Khoá webhook chỉ lưu dạng băm.
 */
export class GreetingIntegrationRepository {
  constructor(private readonly db = prisma) {}

  async getForTenant(ctx: TenantContext) {
    return this.db.greeting_integrations.findFirst({ where: scopedWhere(ctx, {}) })
  }

  /** Tra tổ chức theo băm khoá webhook — đường duy nhất webhook công khai biết mình thuộc tiệm nào. */
  async findByPaymentKeyHash(hash: string) {
    return this.db.greeting_integrations.findFirst({
      where: { payment_webhook_key_hash: hash, payment_webhook_enabled: true },
      select: { organization_id: true, payment_provider: true },
    })
  }

  async setPaymentWebhookKey(ctx: TenantContext, input: { provider: string; hash: string; hint: string } | null) {
    const data = input
      ? { payment_provider: input.provider, payment_webhook_key_hash: input.hash, payment_webhook_key_hint: input.hint, payment_webhook_enabled: true }
      : { payment_webhook_key_hash: null, payment_webhook_key_hint: null, payment_webhook_enabled: false }
    return this.db.greeting_integrations.upsert({
      where: { organization_id: ctx.organizationId },
      create: { organization_id: ctx.organizationId, ...data },
      update: data,
    })
  }

  /** Ghi giao dịch; trùng mã giao dịch của nhà cung cấp → trả bản ghi đã có (`duplicate: true`). */
  async insertPaymentEvent(organizationId: string, e: NewPaymentEvent) {
    try {
      const row = await this.db.greeting_payment_events.create({
        data: {
          organization_id: organizationId,
          provider: e.provider,
          external_id: e.externalId,
          amount_vnd: e.amountVnd,
          content: e.content.slice(0, 1000),
          account_no: e.accountNo,
          transaction_at: e.transactionAt,
          status: "RECEIVED",
        },
      })
      return { row, duplicate: false }
    } catch (error) {
      if (!isUniqueViolation(error)) throw error
      const row = await this.db.greeting_payment_events.findFirstOrThrow({
        where: { organization_id: organizationId, provider: e.provider, external_id: e.externalId },
      })
      return { row, duplicate: true }
    }
  }

  async resolvePaymentEvent(
    id: string,
    data: { status: PaymentEventStatus; orderId?: string | null; paymentId?: string | null; note?: string | null }
  ) {
    return this.db.greeting_payment_events.update({
      where: { id },
      data: {
        status: data.status,
        order_id: data.orderId ?? null,
        payment_id: data.paymentId ?? null,
        note: data.note ?? null,
      },
    })
  }

  async findPaymentByReference(organizationId: string, reference: string) {
    return this.db.order_payments.findFirst({
      where: { organization_id: organizationId, reference },
      select: { id: true, order_id: true },
    })
  }

  async findBrochureOrderByCode(organizationId: string, code: string) {
    return this.db.orders.findFirst({
      where: { organization_id: organizationId, code, source: "BROCHURE" },
      select: { id: true, code: true, status: true, total_vnd: true, paid_vnd: true },
    })
  }

  async listPaymentEvents(
    ctx: TenantContext,
    options: { status?: PaymentEventStatus | undefined; limit: number; cursor?: string | undefined }
  ) {
    const rows = await this.db.greeting_payment_events.findMany({
      where: scopedWhere(ctx, options.status ? { status: options.status } : {}),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
    return rows.map((r) => ({ ...r, amount_vnd: Number(r.amount_vnd) }))
  }

  async markPaymentEventHandled(ctx: TenantContext, id: string, note: string): Promise<boolean> {
    const res = await this.db.greeting_payment_events.updateMany({
      where: scopedWhere(ctx, { id, status: "UNMATCHED" }),
      data: { status: "IGNORED", note },
    })
    return res.count > 0
  }
}

let _greetingIntegrationRepositorySingleton: GreetingIntegrationRepository | null = null
export function getGreetingIntegrationRepository(): GreetingIntegrationRepository {
  if (!_greetingIntegrationRepositorySingleton) _greetingIntegrationRepositorySingleton = new GreetingIntegrationRepository()
  return _greetingIntegrationRepositorySingleton
}
