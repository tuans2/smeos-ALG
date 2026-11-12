import { openSecret, sealSecret } from "@/core/security/secret-box"
import { queueOverdraftAlert } from "@/modules/usage/use-cases/credit-alerts"
import { overdraftSignals } from "@/modules/usage/domain/message-overdraft"
import { runInBackground } from "@/core/runtime/background"
import { log } from "@/core/observability/log"
import { publicAppUrl } from "@/lib/public-url"
import { GreetingNotificationRepository, getGreetingNotificationRepository } from "../infra/greeting-notification-repository"
import {
  NOTIFY_EVENT_LABELS,
  maskPhone,
  smsText,
  toInternationalPhone,
  type NotifyEvent,
  type NotifyParams,
} from "../domain/customer-notifications"
import { sendZnsMessage, type FetchLike, type ZnsCredentials } from "../adapters/zalo-zns-adapter"
import { sendEsmsMessage, type EsmsCredentials } from "../adapters/esms-adapter"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { readCreditPricing } from "@/modules/usage/infra/credit-pricing-store"
import { recordProviderCost } from "@/modules/usage/infra/provider-cost-repository"
import { expectedPayment, parsePaymentPolicy } from "../domain/brochure-payment-policy"
import { policyForOrder } from "../domain/payment-plan"
import { paymentProgress } from "@/modules/orders/domain/payment-progress"

export const NOTIFY_SECRET_PURPOSE = "greeting-card-notify"

const DUE_EVENTS = new Set<NotifyEvent>(["QUOTED", "PAYMENT_REMINDER"])

function dueNowVnd(order: { total_vnd: unknown; paid_vnd: unknown; pricing_rule_ref: unknown; organization: { settings: unknown } }): number {
  const policy = policyForOrder(parsePaymentPolicy(order.organization.settings), order.pricing_rule_ref)
  return expectedPayment(policy, Number(order.total_vnd), Number(order.paid_vnd)).amountVnd
}

export type NotifyOutcome = "SENT" | "FAILED" | "SKIPPED" | "DUPLICATE" | "DISABLED"

function publicBaseUrl(): string {
  return publicAppUrl()
}

/** Thu/hoàn credit cho mỗi tin gửi khách (checklist ALG 10.3). */
export interface MessageCredits {
  costOf(channel: "ZNS" | "ESMS"): Promise<number>
  charge(organizationId: string, cost: number, channel: "ZNS" | "ESMS"): Promise<boolean>
  refund(organizationId: string, cost: number, channel: "ZNS" | "ESMS"): Promise<void>
  /** Ghi chi phí thật theo giá vốn tham chiếu (checklist ALG 10.4) */
  recordCost(organizationId: string, channel: "ZNS" | "ESMS", reference: string): Promise<void>
}

const serviceOf = (channel: "ZNS" | "ESMS") => (channel === "ZNS" ? "ZNS" : "SMS") as "ZNS" | "SMS"

const defaultMessageCredits: MessageCredits = {
  async costOf(channel) {
    const pricing = await readCreditPricing()
    return channel === "ZNS" ? pricing.znsCredit : pricing.smsCredit
  },
  async charge(organizationId, cost, channel) {
    const repo = new OrganizationRepository()
    const meta = { service: serviceOf(channel), reason: `Tin ${serviceOf(channel)} gửi khách` }
    if (await repo.tryDeductCreditFor(organizationId, cost, meta).catch(() => false)) return true
    // Hết credit hoặc chạm hạn mức tháng: tin vẫn gửi trong mức thấu chi Console đặt, báo Điều hành (PO 05/11/2026)
    const overdraft = (await readCreditPricing()).messageOverdraftCredit
    const balance = await repo.tryOverdraftCreditFor(organizationId, cost, overdraft, meta).catch(() => null)
    if (balance === null) return false
    queueOverdraftAlert(organizationId, { balance, overdraft, ...overdraftSignals(balance, cost, overdraft) })
    return true
  },
  refund: (organizationId, cost, channel) =>
    new OrganizationRepository().refundCreditFor(organizationId, cost, { service: serviceOf(channel), reason: "Tin gửi lỗi" }),
  async recordCost(organizationId, channel, reference) {
    const pricing = await readCreditPricing()
    await recordProviderCost(organizationId, {
      provider: channel === "ZNS" ? "ZALO_ZNS" : "ESMS", service: serviceOf(channel),
      costVnd: channel === "ZNS" ? pricing.znsCostVnd : pricing.smsCostVnd, reference,
    })
  },
}

/**
 * Gửi tin cho khách ở một mốc đơn. Không bao giờ ném lỗi ra ngoài: thông báo
 * là việc phụ, không được làm hỏng thao tác chính (thu tiền, giao hàng...).
 * Mỗi (đơn, mốc) gửi đúng một lần; lần trước FAILED thì lần kích hoạt sau gửi lại.
 */
export async function notifyOrderEvent(
  organizationId: string,
  orderId: string,
  event: NotifyEvent,
  repo = getGreetingNotificationRepository(),
  fetchImpl: FetchLike = fetch,
  credits: MessageCredits = defaultMessageCredits,
): Promise<NotifyOutcome> {
  const config = await repo.getChannelConfig(organizationId)
  if (!config?.notify_enabled || !config.notify_channel || !config.notify_config_encrypted) return "DISABLED"
  const channel = config.notify_channel as "ZNS" | "ESMS"
  const templates = (config.notify_templates as Record<string, string> | null) ?? {}
  if (channel === "ZNS" && !templates[event]) return "DISABLED" // tiệm chưa đăng ký mẫu ZNS cho mốc này

  const order = await repo.orderFacts(organizationId, orderId)
  if (!order) return "SKIPPED"
  const phone = toInternationalPhone(order.customer?.phone)
  const claim = await repo.claim(organizationId, orderId, event, channel, phone ? maskPhone(phone) : "không có SĐT")
  if (!claim) return "DUPLICATE"
  if (!phone) {
    await repo.finish(claim.id, { status: "SKIPPED", error: "Khách không có số điện thoại hợp lệ" })
    return "SKIPPED"
  }

  // Quy đổi tin nhắn ra credit theo cấu hình nền tảng (PO Q10, checklist ALG 10.3); 0 = không thu
  const messageCost = await credits.costOf(channel)
  if (messageCost > 0 && !(await credits.charge(organizationId, messageCost, channel))) {
    await repo.finish(claim.id, { status: "SKIPPED", error: "Hết credit và đã dùng hết mức thấu chi tin nhắn" })
    return "SKIPPED"
  }

  const sendCode = order.source_session_id ? await repo.sendCodeOf(organizationId, order.source_session_id) : null
  const base = publicBaseUrl()
  const paid = Number(order.paid_vnd)
  const total = Number(order.total_vnd)
  const isBalanceDue = paymentProgress(total, paid) === "DEPOSIT" && (event === "READY" || event === "DELIVERED")
  const isDueEvent = DUE_EVENTS.has(event) || isBalanceDue

  const params: NotifyParams = {
    order_code: order.code,
    customer_name: order.customer?.name ?? "Quý khách",
    shop_name: order.organization.business_profile?.display_name || order.organization.name,
    status: NOTIFY_EVENT_LABELS[event],
    // Mốc đòi tiền báo đúng khoản phải chuyển LẦN NÀY (cọc theo kế hoạch của đơn, hoặc phần còn lại)
    // — trùng số tiền trên mã QR; mốc đã thu báo số đã nhận
    amount: `${(isDueEvent ? dueNowVnd(order) : paid).toLocaleString("vi-VN")} đ`,
    tracking_url: base && sendCode ? `${base}/b/${sendCode}` : "",
  }

  try {
    const creds = JSON.parse(openSecret(config.notify_config_encrypted, NOTIFY_SECRET_PURPOSE)) as unknown
    let messageId: string | null
    if (channel === "ZNS") {
      const result = await sendZnsMessage(
        { creds: creds as ZnsCredentials, templateId: templates[event]!, phone, params, trackingId: claim.id },
        fetchImpl
      )
      if (result.updatedCredentials) {
        await repo.saveSealedCredentials(organizationId, sealSecret(JSON.stringify(result.updatedCredentials), NOTIFY_SECRET_PURPOSE))
      }
      messageId = result.messageId
    } else {
      const skippedPhoto = (order as { qc_records?: Array<{ notes?: string | null }> }).qc_records?.some((qc) => qc.notes === "PRODUCT_PHOTO_SKIPPED") ?? false
      const result = await sendEsmsMessage(
        { creds: creds as EsmsCredentials, phone, content: smsText(event, params, { isBalanceDue, skippedPhoto }), requestId: claim.id },
        fetchImpl
      )
      messageId = result.messageId
    }
    await repo.finish(claim.id, { status: "SENT", providerMessageId: messageId })
    await credits.recordCost(organizationId, channel, claim.id).catch(() => undefined)
    return "SENT"
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn("greeting_card.notify_failed", { organizationId, feature: "greeting-card", event, channel, message })
    await repo.finish(claim.id, { status: "FAILED", error: message })
    if (messageCost > 0) await credits.refund(organizationId, messageCost, channel)
    return "FAILED"
  }
}

/** Gửi nền sau khi thao tác chính đã ghi xong — người dùng không phải chờ nhà mạng. */
export function queueOrderNotification(organizationId: string, orderId: string, event: NotifyEvent): void {
  runInBackground(`notify:${event}`, () => notifyOrderEvent(organizationId, orderId, event))
}
