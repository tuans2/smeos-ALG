import { createHash, randomBytes } from "node:crypto"
import type { TenantContext } from "@/core/tenancy"
import { AppError, notFound, unauthenticated } from "@/core/http/errors"
import { log } from "@/core/observability/log"
import { GreetingIntegrationRepository, getGreetingIntegrationRepository } from "../infra/greeting-integration-repository"
import { BrochurePaymentRepository, getBrochurePaymentRepository } from "../infra/brochure-payment-repository"
import { decideTransfer, extractOrderCode } from "../domain/bank-transfer-matching"
import { paymentNotifyEvent } from "../domain/customer-notifications"
import { queueOrderNotification } from "./notify-customer"
import { resolveSaleScope } from "./order-scope"
import type { PaymentEventStatus } from "../infra/greeting-integration-repository"
import { runInBackground } from "@/core/runtime/background"
import { dispatchAfterPaymentConfirmed } from "./dispatch-after-payment"

export const SEPAY_PROVIDER = "SEPAY"

/** Giao dịch SePay đã qua kiểm hình dạng ở route. */
export interface SepayTransfer {
  id: number | string
  transferType: string
  transferAmount: number
  content: string
  accountNumber?: string | null | undefined
  transactionDate?: string | null | undefined
  referenceCode?: string | null | undefined
}

export function hashWebhookKey(key: string): string {
  return createHash("sha256").update(key).digest("hex")
}

/** Ngữ cảnh "hệ thống" cho thao tác do webhook kích hoạt — audit ghi rõ nguồn. */
function systemContext(organizationId: string, actor: string): TenantContext {
  return { organizationId, workspaceId: "", userId: actor, branchId: null, capabilities: new Set() }
}

/** Bật đối soát tự động: sinh khoá mới (chỉ trả MỘT lần), khoá cũ mất hiệu lực. */
export async function rotatePaymentWebhookKey(ctx: TenantContext, repo = getGreetingIntegrationRepository()) {
  const key = `brk_${randomBytes(24).toString("base64url")}`
  await repo.setPaymentWebhookKey(ctx, { provider: SEPAY_PROVIDER, hash: hashWebhookKey(key), hint: key.slice(-4) })
  return { apiKey: key, provider: SEPAY_PROVIDER, webhookPath: "/api/v1/public/payments/sepay" }
}

export async function disablePaymentWebhook(ctx: TenantContext, repo = getGreetingIntegrationRepository()) {
  await repo.setPaymentWebhookKey(ctx, null)
  return { enabled: false }
}

/**
 * Xử lý một giao dịch SePay. Idempotent theo mã giao dịch: SePay gửi lại
 * (timeout, retry) không ghi thu hai lần; lần xử lý trước chết giữa chừng thì
 * lần sau xử lý tiếp. Giao dịch không khớp đơn được giữ lại cho Điều hành.
 */
export async function handleSepayWebhook(
  apiKey: string | null,
  transfer: SepayTransfer,
  repo = getGreetingIntegrationRepository(),
  payments = getBrochurePaymentRepository()
) {
  if (!apiKey) throw unauthenticated()
  const integration = await repo.findByPaymentKeyHash(hashWebhookKey(apiKey))
  if (!integration) throw unauthenticated()
  const orgId = integration.organization_id

  const { row, duplicate } = await repo.insertPaymentEvent(orgId, {
    provider: SEPAY_PROVIDER,
    externalId: String(transfer.id),
    amountVnd: Math.round(transfer.transferAmount),
    content: transfer.content,
    accountNo: transfer.accountNumber ?? null,
    transactionAt: transfer.transactionDate ? new Date(`${transfer.transactionDate.replace(" ", "T")}+07:00`) : null,
  })
  const reference = `SEPAY-${transfer.id}`
  if (duplicate && row.status !== "RECEIVED") return { status: row.status, duplicate: true }
  if (duplicate) {
    const done = await repo.findPaymentByReference(orgId, reference)
    if (done) {
      await repo.resolvePaymentEvent(row.id, { status: "MATCHED", orderId: done.order_id, paymentId: done.id })
      return { status: "MATCHED", duplicate: true }
    }
  }

  if (transfer.transferType !== "in") {
    await repo.resolvePaymentEvent(row.id, { status: "IGNORED", note: "Giao dịch tiền ra" })
    return { status: "IGNORED", duplicate }
  }

  const code = extractOrderCode(transfer.content)
  const order = code ? await repo.findBrochureOrderByCode(orgId, code) : null
  const decision = decideTransfer(
    order ? { status: order.status, totalVnd: Number(order.total_vnd), paidVnd: Number(order.paid_vnd) } : null,
    Math.round(transfer.transferAmount)
  )
  if (!order || decision.kind === "UNMATCHED") {
    const note = decision.kind === "UNMATCHED" ? decision.note : "Không tìm thấy đơn"
    await repo.resolvePaymentEvent(row.id, { status: "UNMATCHED", orderId: order?.id ?? null, note })
    return { status: "UNMATCHED", duplicate }
  }

  try {
    const result = await payments.recordIncomingPayment(systemContext(orgId, "system:sepay"), order.id, {
      amountVnd: decision.amountVnd,
      method: "BANK_TRANSFER",
      reference,
      note: ["Tự động đối soát qua SePay", transfer.referenceCode, decision.note].filter(Boolean).join(" · "),
    })
    await repo.resolvePaymentEvent(row.id, { status: "MATCHED", orderId: order.id, paymentId: result.paymentId, note: decision.note })
    queueOrderNotification(orgId, order.id, paymentNotifyEvent(result.balanceVnd))
    // Chuỗi ở chế độ tự động: tiền về qua SePay → tự chọn cửa hàng và phát lệnh (chạy nền, webhook trả ngay)
    const ctx = systemContext(orgId, "system:sepay")
    runInBackground("chain-dispatch:after-sepay", () => dispatchAfterPaymentConfirmed(ctx, order.id))
    return { status: "MATCHED", duplicate, orderCode: order.code }
  } catch (error) {
    const note = error instanceof AppError ? error.message : "Lỗi ghi thu tự động"
    log.warn("greeting_card.sepay_record_failed", { organizationId: orgId, feature: "greeting-card", note })
    await repo.resolvePaymentEvent(row.id, { status: "UNMATCHED", orderId: order.id, note })
    return { status: "UNMATCHED", duplicate }
  }
}

/** Điều hành đánh dấu đã xử lý tay một giao dịch không khớp (đã hoàn tiền, đã ghi thu tay...). */
export async function markPaymentEventHandled(
  ctx: TenantContext,
  id: string,
  note: string,
  repo = getGreetingIntegrationRepository()
) {
  // Tiền chưa khớp không thuộc riêng sale nào — sale "chỉ khách của mình" không xử lý được
  if (await resolveSaleScope(ctx)) throw notFound()
  if (!(await repo.markPaymentEventHandled(ctx, id, note))) throw notFound()
  return { handled: true }
}

/** Giao dịch ngân hàng (cho Điều hành). Sale "chỉ khách của mình" nhận danh sách rỗng. */
export async function listPaymentEvents(
  ctx: TenantContext,
  options: { status?: PaymentEventStatus | undefined; limit: number; cursor?: string | undefined },
  repo = getGreetingIntegrationRepository()
) {
  if (await resolveSaleScope(ctx)) return []
  return repo.listPaymentEvents(ctx, options)
}
