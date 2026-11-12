import { log } from "@/core/observability/log"
import type { DbClient } from "@/modules/organization/infra/db-client"
import { planChangeKind, prorationVnd, repricedPendingAmount, splitOverpayment } from "../domain/plan-change"
import { addCycle, type SubscriptionCycle } from "../domain/subscription-rules"
import { anchorDayOf, ensureInvoice, markInvoicePaid, uniqueCode } from "./subscription-repository"

/**
 * Tiền khi đổi gói và khi khách chuyển dư (PO 12/11/2026, audit BL-27). Luật ở `domain/plan-change.ts`. Mọi hàm chạy
 * trong giao dịch của bên gọi.
 */

interface SubBilling {
  id: string
  organization_id: string
  price_vnd: number
  cycle: string
  current_period_start: Date
  current_period_end: Date
}

/**
 * Trước khi ghi giá mới: nâng gói → hoá đơn bù chênh lệch cho phần còn lại của kỳ (hạn trả = ngày gia hạn); mọi lần đổi
 * giá → hoá đơn kỳ sau đã sinh, chưa thu, được sửa theo giá mới (trước đây giữ giá cũ thêm một kỳ). Trả hoá đơn bù.
 */
export async function applyPlanChangeBilling(db: DbClient, sub: SubBilling, next: { priceVnd: number; cycle: SubscriptionCycle; now: Date }) {
  const before = { priceVnd: sub.price_vnd, cycle: sub.cycle as SubscriptionCycle }
  const kind = planChangeKind(before, next)
  if (kind === "NONE") return null
  const anchor = await anchorDayOf(db, sub.id, sub.current_period_start)
  const pending = await db.subscription_invoices.findMany({
    where: { subscription_id: sub.id, status: "PENDING", period_start: { gte: sub.current_period_end } },
    select: { id: true, amount_vnd: true, period_start: true },
  })
  for (const inv of pending) {
    await db.subscription_invoices.update({
      where: { id: inv.id },
      data: { amount_vnd: repricedPendingAmount(inv.amount_vnd, before.priceVnd, next.priceVnd), period_end: addCycle(inv.period_start, next.cycle, anchor) },
    })
  }
  if (kind !== "UPGRADE") return null
  const amount = prorationVnd({
    oldPriceVnd: before.priceVnd, newPriceVnd: next.priceVnd, periodStart: sub.current_period_start, periodEnd: sub.current_period_end, now: next.now,
  })
  if (amount <= 0) return null
  return db.subscription_invoices.create({
    data: {
      organization_id: sub.organization_id, subscription_id: sub.id, code: await uniqueCode(db),
      period_start: next.now, period_end: sub.current_period_end, amount_vnd: amount, due_at: sub.current_period_end,
    },
  })
}

/**
 * Khách chuyển nhiều hơn hoá đơn: phần dư trừ vào hoá đơn kỳ kế tiếp (sinh sớm nếu chưa có); trừ hết → hoá đơn đó
 * coi như đã thu. Phần còn thừa ghi nhật ký để vận hành hoàn khi khách yêu cầu. Gọi sau `markInvoicePaid`.
 */
export async function applyOverpayment(db: DbClient, paid: { id: string; code: string; subscription_id: string }, surplusVnd: number, now: Date) {
  if (surplusVnd <= 0) return { appliedVnd: 0, leftoverVnd: 0 }
  const sub = await db.subscriptions.findUniqueOrThrow({ where: { id: paid.subscription_id } })
  if (sub.status === "CANCELLED") {
    log.warn("subscription.overpayment_leftover", { invoiceId: paid.id, leftoverVnd: surplusVnd })
    return { appliedVnd: 0, leftoverVnd: surplusVnd }
  }
  const target = await ensureInvoice(db, { ...sub, cycle: sub.cycle as SubscriptionCycle }, sub.current_period_end)
  const { appliedVnd, leftoverVnd } = splitOverpayment(surplusVnd, target.status === "PENDING" ? target.amount_vnd : 0)
  if (appliedVnd > 0) {
    // Có điều kiện theo số tiền đã đọc — hai giao dịch đồng thời không trừ chồng
    const n = await db.subscription_invoices.updateMany({
      where: { id: target.id, status: "PENDING", amount_vnd: target.amount_vnd },
      data: { amount_vnd: target.amount_vnd - appliedVnd },
    })
    if (n.count === 0) return { appliedVnd: 0, leftoverVnd: surplusVnd }
    if (appliedVnd === target.amount_vnd) await markInvoicePaid(db, target.id, `CREDIT-${paid.code}`, now)
    log.info("subscription.overpayment_applied", { fromInvoiceId: paid.id, toInvoiceId: target.id, appliedVnd })
  }
  if (leftoverVnd > 0) log.warn("subscription.overpayment_leftover", { invoiceId: paid.id, leftoverVnd })
  return { appliedVnd, leftoverVnd }
}
