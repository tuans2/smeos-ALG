import { runInTransaction } from "@/modules/organization/infra/transaction"
import { OrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { creditUsedInPeriod } from "@/modules/usage/infra/usage-limit-repository"
import { creditPeriod } from "@/modules/usage/domain/monthly-limit"
import { runInBackground } from "@/core/runtime/background"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { formatCurrency, formatDate } from "@/lib/i18n/formatters"
import { applyDuePendingChange, claimPlanCreditPeriod, claimReminder, ensureInvoice, findPendingInvoices, findSubscription, markActive, markOverdue } from "../infra/subscription-repository"
import { expiringPlanCredit, renewalOpensAt, reminderDue, type SubscriptionCycle } from "../domain/subscription-rules"
import type { DbClient } from "@/modules/organization/infra/db-client"

/**
 * Vòng đời thuê bao xét khi tổ chức thao tác (checklist ALG 10.7, PO Q9) — không cần lịch chạy nền:
 * mở hoá đơn kỳ sau 7 ngày trước hạn và nhắc 7 ngày / 1 ngày; hoá đơn tới hạn chưa thu → OVERDUE (chỉ xem);
 * đầu tháng cấp credit tặng theo gói, thu hồi phần tháng trước còn thừa (PO Q10). Đường nhanh: một truy vấn.
 */

export interface SubscriptionState { readOnly: boolean }

export async function checkSubscription(organizationId: string, now: Date = new Date()): Promise<SubscriptionState> {
  let sub = await findSubscription(organizationId)
  if (!sub || sub.status === "CANCELLED") return { readOnly: false }
  // Hạ gói chờ áp đã tới kỳ → áp trước khi xét credit tặng và hoá đơn (audit BL-27)
  if (sub.pending_change && (await runInTransaction((tx) => applyDuePendingChange(tx, sub!.id, now)))) {
    sub = (await findSubscription(organizationId))!
  }
  const current = sub
  const period = creditPeriod(now)
  const quiet = current.status === "ACTIVE" && now < renewalOpensAt(current.current_period_end)
    && (current.included_credits_monthly === 0 || current.plan_credit_period === period)
  if (quiet) return { readOnly: false }

  const notices: Array<{ eventKey: string; title: string; message: string }> = []
  const readOnly = await runInTransaction(async (tx) => {
    if (now >= renewalOpensAt(current.current_period_end)) {
      await ensureInvoice(tx, { ...current, cycle: current.cycle as SubscriptionCycle }, current.current_period_end)
    }
    const pending = await findPendingInvoices(current.id, tx)
    for (const inv of pending) {
      for (const days of [7, 1] as const) {
        if (inv.due_at > now && reminderDue(inv.due_at, days, now) && (await claimReminder(tx, inv.id, days))) {
          notices.push({
            eventKey: "SUBSCRIPTION_RENEWAL_DUE", title: "Sắp tới hạn gia hạn gói dịch vụ",
            message: `Hoá đơn ${inv.code} — ${formatCurrency(inv.amount_vnd)}, hạn ${formatDate(inv.due_at)}. Quá hạn chưa thanh toán thì tài khoản chuyển sang chỉ xem.`,
          })
        }
      }
    }
    const overdue = pending.some((inv) => inv.due_at <= now)
    if (overdue && current.status !== "OVERDUE") {
      await markOverdue(tx, current.id)
      notices.push({ eventKey: "SUBSCRIPTION_OVERDUE", title: "Gói dịch vụ quá hạn thanh toán", message: "Tài khoản đang ở chế độ chỉ xem. Thanh toán hoá đơn để mở lại ngay." })
    }
    if (!overdue && current.status === "OVERDUE") await markActive(tx, current.id)
    if (!overdue && current.included_credits_monthly > 0 && current.plan_credit_period !== period) await rollPlanCredits(tx, current, period)
    return overdue
  })
  if (notices.length > 0) {
    runInBackground("subscription-notices", async () => {
      for (const n of notices) await notifyOrganization({ organizationId, ...n })
    })
  }
  return { readOnly }
}

async function rollPlanCredits(
  tx: DbClient,
  sub: { id: string; organization_id: string; included_credits_monthly: number; plan_credit_period: string | null; plan_credit_granted: number },
  period: string,
): Promise<void> {
  // Chiếm quyền cấp cho kỳ này — hai yêu cầu đồng thời chỉ một cái cấp
  if (!(await claimPlanCreditPeriod(tx, sub.id, sub.plan_credit_period, period, sub.included_credits_monthly))) return
  const orgs = new OrganizationRepository(tx)
  if (sub.plan_credit_period && sub.plan_credit_granted > 0) {
    const org = await orgs.findById(sub.organization_id)
    const used = await creditUsedInPeriod(tx, sub.organization_id, sub.plan_credit_period)
    const expire = expiringPlanCredit(sub.plan_credit_granted, used, org?.credit_balance ?? 0)
    await orgs.expireCredit(sub.organization_id, expire, { service: "SUBSCRIPTION", reason: `Credit tặng theo gói tháng ${sub.plan_credit_period} hết hạn` })
  }
  await orgs.topUpCredit(sub.organization_id, sub.included_credits_monthly, "GIFT", { service: "SUBSCRIPTION", reason: `Credit tặng theo gói tháng ${period}` })
}
