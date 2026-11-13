import type { TenantContext } from "@/core/tenancy"
import { requireCapability } from "@/core/rbac/capabilities"
import { findSubscription, listInvoices } from "../infra/subscription-repository"
import { readBillingAccount } from "../infra/billing-account-store"
import { invoiceView, type InvoiceView } from "./invoice-view"
import { PLAN_LABEL, isPlanCode } from "../domain/subscription-rules"
import { parsePendingChange, type PendingPlanChange } from "../domain/plan-change"

/** Gói thuê bao của cửa hàng (checklist ALG 10.7, `D1`): gói, kỳ hiện tại, trạng thái, hoá đơn cần trả kèm mã VietQR. */
export async function getMySubscription(ctx: TenantContext): Promise<{
  subscription: {
    plan: string; planLabel: string; cycle: string; priceVnd: number; status: string; currentPeriodEnd: string; includedCreditsMonthly: number
    /** Hạ gói / đổi chu kỳ chờ áp từ kỳ sau (audit BL-27). */
    pendingChange: { planLabel: string; cycle: string; priceVnd: number; effectiveAt: string } | null
  } | null
  invoices: InvoiceView[]
}> {
  requireCapability(ctx, "D1")
  const [sub, invoices, account] = await Promise.all([findSubscription(ctx.organizationId), listInvoices(ctx.organizationId, 6), readBillingAccount()])
  return {
    subscription: sub
      ? {
          plan: sub.plan, planLabel: isPlanCode(sub.plan) ? PLAN_LABEL[sub.plan] : sub.plan, cycle: sub.cycle, priceVnd: sub.price_vnd,
          status: sub.status, currentPeriodEnd: sub.current_period_end.toISOString(), includedCreditsMonthly: sub.included_credits_monthly,
          pendingChange: pendingView(parsePendingChange(sub.pending_change)),
        }
      : null,
    invoices: invoices.map((i) => invoiceView(i, account)),
  }
}

function pendingView(p: PendingPlanChange | null) {
  return p ? { planLabel: isPlanCode(p.plan) ? PLAN_LABEL[p.plan] : p.plan, cycle: p.cycle, priceVnd: p.priceVnd, effectiveAt: p.effectiveAt } : null
}
