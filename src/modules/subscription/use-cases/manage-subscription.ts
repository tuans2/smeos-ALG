import { randomUUID } from "node:crypto"

import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { AppError, notFound, validationFailed } from "@/core/http/errors"
import { runInTransaction } from "@/modules/organization/infra/transaction"
import { planChangeBlockedReason } from "@/modules/organization/domain/isolation-tier"
import { isolationTierOf } from "@/modules/organization/infra/organization-lifecycle-repository"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { recordPlatformAuditLog } from "@/modules/platform/infra/platform-audit-repository"
import { cancelSubscriptionRows, findSubscription, listInvoices, markInvoicePaid, upsertSubscription } from "../infra/subscription-repository"
import { parseBillingAccount, readBillingAccount, writeBillingAccount, type BillingAccount } from "../infra/billing-account-store"
import { invoiceView, type InvoiceView } from "./invoice-view"
import { isPlanCode, type SubscriptionCycle } from "../domain/subscription-rules"

/**
 * Console → tổ chức → Gói thuê bao (checklist ALG 10.7, PO Q9). Xem `N1`; gán/đổi gói, huỷ, xác nhận thu tiền,
 * tài khoản nhận tiền: `N19`. Giá theo kỳ do Console nhập. Mọi thao tác ghi nhật ký nền tảng.
 */

export const MAX_PRICE_VND = 1_000_000_000

/** Đổi / huỷ gói làm mức cô lập hiện tại không còn được phép → 422 (ADR-016 D-S2, PO 12/11/2026). */
async function assertTierStillAllowed(organizationId: string, nextPlan: string | null): Promise<void> {
  const tier = await isolationTierOf(organizationId)
  const blocked = tier ? planChangeBlockedReason(tier, nextPlan) : null
  if (blocked) throw new AppError("UNPROCESSABLE_ENTITY", blocked)
}

export async function getOrganizationSubscription(pctx: PlatformContext, organizationId: string) {
  requirePlatformCapability(pctx, "N1")
  if (!(await new OrganizationRepository().findById(organizationId))) throw notFound()
  const [subscription, invoices, account] = await Promise.all([findSubscription(organizationId), listInvoices(organizationId), readBillingAccount()])
  return { subscription, invoices: invoices.map((i) => invoiceView(i, account)) as InvoiceView[] }
}

export interface AssignSubscriptionInput {
  plan: string
  cycle: SubscriptionCycle
  priceVnd: number
  includedCreditsMonthly: number
  firstPeriodPaid?: boolean | undefined
}

export async function assignSubscription(pctx: PlatformContext, organizationId: string, input: AssignSubscriptionInput) {
  requirePlatformCapability(pctx, "N19")
  if (!isPlanCode(input.plan)) throw validationFailed({ plan: "Gói không hợp lệ" })
  if (!Number.isInteger(input.priceVnd) || input.priceVnd < 0 || input.priceVnd > MAX_PRICE_VND) throw validationFailed({ priceVnd: "Giá theo kỳ là số nguyên không âm" })
  if (!Number.isInteger(input.includedCreditsMonthly) || input.includedCreditsMonthly < 0 || input.includedCreditsMonthly > 10_000_000) {
    throw validationFailed({ includedCreditsMonthly: "Credit tặng mỗi tháng là số nguyên không âm" })
  }
  if (!(await new OrganizationRepository().findById(organizationId))) throw notFound()
  await assertTierStillAllowed(organizationId, input.plan)
  const before = await findSubscription(organizationId)
  const result = await runInTransaction(async (tx) => {
    const r = await upsertSubscription(tx, organizationId, { ...input, actorId: pctx.userId, now: new Date() })
    if (r.firstInvoice && (input.firstPeriodPaid || input.priceVnd === 0)) await markInvoicePaid(tx, r.firstInvoice.id, `CONSOLE-${randomUUID()}`, new Date())
    return r
  })
  await recordPlatformAuditLog(pctx, {
    action: before ? "platform.subscription.update" : "platform.subscription.assign",
    entityType: "subscriptions", entityId: organizationId,
    before: before ? { plan: before.plan, cycle: before.cycle, priceVnd: before.price_vnd } : null,
    after: {
      plan: input.plan, cycle: input.cycle, priceVnd: input.priceVnd, includedCreditsMonthly: input.includedCreditsMonthly, firstPeriodPaid: Boolean(input.firstPeriodPaid),
      ...(result.prorationInvoice ? { prorationInvoice: { code: result.prorationInvoice.code, amountVnd: result.prorationInvoice.amount_vnd } } : {}),
    },
  })
  return result.sub
}

export async function cancelSubscription(pctx: PlatformContext, organizationId: string) {
  requirePlatformCapability(pctx, "N19")
  const sub = await findSubscription(organizationId)
  if (!sub) throw notFound()
  await assertTierStillAllowed(organizationId, null)
  await runInTransaction((tx) => cancelSubscriptionRows(tx, sub.id))
  await recordPlatformAuditLog(pctx, { action: "platform.subscription.cancel", entityType: "subscriptions", entityId: organizationId, before: { status: sub.status }, after: { status: "CANCELLED" } })
}

/** Console xác nhận đã nhận tiền (khoản SePay không khớp, chuyển khoản tay). */
export async function confirmInvoicePayment(pctx: PlatformContext, invoiceId: string, note: string) {
  requirePlatformCapability(pctx, "N19")
  if (note.trim().length < 3) throw validationFailed({ note: "Ghi chú nguồn tiền (mã giao dịch, ngày nhận)" })
  const paid = await runInTransaction((tx) => markInvoicePaid(tx, invoiceId, `CONSOLE-${randomUUID()}`, new Date()))
  if (!paid) throw notFound()
  await recordPlatformAuditLog(pctx, { action: "platform.subscription_invoice.mark_paid", entityType: "subscription_invoices", entityId: invoiceId, before: { status: "PENDING" }, after: { status: "PAID", note: note.trim() } })
  return { id: paid.id, organizationId: paid.organization_id }
}

export async function getBillingAccount(pctx: PlatformContext): Promise<BillingAccount | null> {
  requirePlatformCapability(pctx, "N1")
  return readBillingAccount()
}

export async function setBillingAccount(pctx: PlatformContext, raw: unknown): Promise<BillingAccount> {
  requirePlatformCapability(pctx, "N19")
  const acc = parseBillingAccount(raw)
  if (!acc) throw validationFailed({ account: "Cần mã BIN ngân hàng 6 số, số tài khoản 6–20 số và tên chủ tài khoản" })
  const before = await readBillingAccount()
  await writeBillingAccount(acc, pctx.userId)
  await recordPlatformAuditLog(pctx, { action: "platform.billing_account.set", entityType: "platform_settings", entityId: "platform_billing_account", before, after: acc })
  return acc
}
