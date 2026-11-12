import { randomInt } from "node:crypto"

import { prisma } from "@/core/tenancy/infra/prisma"
import type { DbClient } from "@/modules/organization/infra/db-client"
import { applyPlanChangeBilling } from "./plan-change-repository"
import { addCycle, CODE_ALPHABET, formatInvoiceCode, INVOICE_CODE_LENGTH, type SubscriptionCycle } from "../domain/subscription-rules"

/**
 * Thuê bao và hoá đơn kỳ (checklist ALG 10.7). Tổ chức truyền vào là tổ chức của phiên (`TenantContext`)
 * hoặc tổ chức Console chọn trong đường dẫn đã kiểm quyền nền tảng.
 */

const SUB_SELECT = {
  id: true, organization_id: true, plan: true, cycle: true, price_vnd: true, included_credits_monthly: true, status: true,
  current_period_start: true, current_period_end: true, plan_credit_period: true, plan_credit_granted: true,
} as const

export type SubscriptionRow = NonNullable<Awaited<ReturnType<typeof findSubscription>>>

export function findSubscription(organizationId: string, db: DbClient = prisma) {
  return db.subscriptions.findUnique({ where: { organization_id: organizationId }, select: SUB_SELECT })
}

export function listInvoices(organizationId: string, take = 12) {
  return prisma.subscription_invoices.findMany({ where: { organization_id: organizationId }, orderBy: { period_start: "desc" }, take })
}

export function findPendingInvoices(subscriptionId: string, db: DbClient = prisma) {
  return db.subscription_invoices.findMany({ where: { subscription_id: subscriptionId, status: "PENDING" }, orderBy: { due_at: "asc" } })
}

export async function uniqueCode(db: DbClient): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = formatInvoiceCode(Array.from({ length: INVOICE_CODE_LENGTH }, () => randomInt(CODE_ALPHABET.length)))
    if (!(await db.subscription_invoices.findUnique({ where: { code }, select: { id: true } }))) return code
  }
  throw new Error("Không sinh được mã hoá đơn")
}

/** Ngày neo kỳ = ngày bắt đầu của hoá đơn đầu tiên (audit BL-27); chưa có hoá đơn → ngày của `fallback`. */
export async function anchorDayOf(db: DbClient, subscriptionId: string, fallback: Date): Promise<number> {
  const first = await db.subscription_invoices.findFirst({ where: { subscription_id: subscriptionId }, orderBy: { period_start: "asc" }, select: { period_start: true } })
  return (first?.period_start ?? fallback).getUTCDate()
}

/** Hoá đơn cho một kỳ; đã có hoá đơn kỳ đó thì không tạo thêm (unique subscription_id + period_start). */
export async function ensureInvoice(
  db: DbClient,
  sub: { id: string; organization_id: string; price_vnd: number; cycle: SubscriptionCycle },
  periodStart: Date,
) {
  const existing = await db.subscription_invoices.findUnique({ where: { subscription_id_period_start: { subscription_id: sub.id, period_start: periodStart } } })
  if (existing) return existing
  const anchor = await anchorDayOf(db, sub.id, periodStart)
  return db.subscription_invoices.create({
    data: {
      organization_id: sub.organization_id, subscription_id: sub.id, code: await uniqueCode(db),
      period_start: periodStart, period_end: addCycle(periodStart, sub.cycle, anchor), amount_vnd: sub.price_vnd, due_at: periodStart,
    },
  })
}

export interface UpsertSubscriptionInput {
  plan: string
  cycle: SubscriptionCycle
  priceVnd: number
  includedCreditsMonthly: number
  actorId: string
  now: Date
}

/**
 * Gán gói lần đầu (bắt đầu kỳ ngay, hoá đơn kỳ đầu hạn trả ngay) hoặc đổi gói: nâng gói lập hoá đơn bù chênh lệch,
 * hoá đơn kỳ sau đã sinh được sửa theo giá mới (`plan-change-repository.ts`, audit BL-27).
 */
export async function upsertSubscription(db: DbClient, organizationId: string, input: UpsertSubscriptionInput) {
  const existing = await findSubscription(organizationId, db)
  if (existing) {
    const prorationInvoice = existing.status === "CANCELLED" ? null : await applyPlanChangeBilling(db, existing, input)
    const updated = await db.subscriptions.update({
      where: { organization_id: organizationId },
      data: {
        plan: input.plan, cycle: input.cycle, price_vnd: input.priceVnd, included_credits_monthly: input.includedCreditsMonthly,
        ...(existing.status === "CANCELLED" ? { status: "ACTIVE" as const } : {}),
      },
      select: SUB_SELECT,
    })
    return { sub: updated, firstInvoice: null, prorationInvoice }
  }
  const sub = await db.subscriptions.create({
    data: {
      organization_id: organizationId, plan: input.plan, cycle: input.cycle, price_vnd: input.priceVnd,
      included_credits_monthly: input.includedCreditsMonthly, current_period_start: input.now,
      current_period_end: addCycle(input.now, input.cycle), created_by: input.actorId,
      // Hoá đơn kỳ đầu hạn trả ngay: chưa thu thì chỉ xem (PO Q9); ghi đã thu chuyển ACTIVE
      status: "OVERDUE",
    },
    select: SUB_SELECT,
  })
  const firstInvoice = await ensureInvoice(db, sub, sub.current_period_start)
  return { sub, firstInvoice, prorationInvoice: null }
}

/**
 * Ghi đã thu một hoá đơn (SePay hoặc Console). Chỉ đổi dòng còn PENDING — gọi lại không ghi hai lần.
 * Hoá đơn kỳ sau → kỳ hiện tại dời sang kỳ đó. Không còn hoá đơn quá hạn → ACTIVE.
 */
export async function markInvoicePaid(db: DbClient, invoiceId: string, reference: string, paidAt: Date) {
  const n = await db.subscription_invoices.updateMany({
    where: { id: invoiceId, status: "PENDING" },
    data: { status: "PAID", paid_at: paidAt, payment_reference: reference },
  })
  if (n.count === 0) return null
  const invoice = await db.subscription_invoices.findUniqueOrThrow({ where: { id: invoiceId } })
  const sub = await db.subscriptions.findUniqueOrThrow({ where: { id: invoice.subscription_id } })
  const advance = invoice.period_start.getTime() >= sub.current_period_end.getTime()
  const overdueLeft = await db.subscription_invoices.count({ where: { subscription_id: sub.id, status: "PENDING", due_at: { lte: paidAt } } })
  await db.subscriptions.update({
    where: { id: sub.id },
    data: {
      ...(advance ? { current_period_start: invoice.period_start, current_period_end: invoice.period_end } : {}),
      ...(sub.status !== "CANCELLED" && overdueLeft === 0 ? { status: "ACTIVE" as const } : {}),
    },
  })
  return invoice
}

export async function markActive(db: DbClient, subscriptionId: string): Promise<void> {
  await db.subscriptions.update({ where: { id: subscriptionId }, data: { status: "ACTIVE" } })
}

export async function markOverdue(db: DbClient, subscriptionId: string): Promise<void> {
  await db.subscriptions.update({ where: { id: subscriptionId }, data: { status: "OVERDUE" } })
}

/** Bật cờ nhắc 7 ngày / 1 ngày một lần; true = lần đầu. */
export async function claimReminder(db: DbClient, invoiceId: string, days: 7 | 1): Promise<boolean> {
  const flag = days === 7 ? "reminded_7d" : "reminded_1d"
  const n = await db.subscription_invoices.updateMany({ where: { id: invoiceId, [flag]: false }, data: { [flag]: true } })
  return n.count > 0
}

/** Chiếm quyền cấp credit tặng cho kỳ mới — hai yêu cầu đồng thời chỉ một cái cấp. */
export async function claimPlanCreditPeriod(db: DbClient, subscriptionId: string, previous: string | null, period: string, granted: number): Promise<boolean> {
  const n = await db.subscriptions.updateMany({
    where: { id: subscriptionId, plan_credit_period: previous },
    data: { plan_credit_period: period, plan_credit_granted: granted },
  })
  return n.count > 0
}

export async function cancelSubscriptionRows(db: DbClient, subscriptionId: string): Promise<void> {
  await db.subscriptions.update({ where: { id: subscriptionId }, data: { status: "CANCELLED" } })
  await db.subscription_invoices.updateMany({ where: { subscription_id: subscriptionId, status: "PENDING" }, data: { status: "VOID" } })
}

export function findInvoiceByCode(code: string) {
  return prisma.subscription_invoices.findUnique({ where: { code } })
}

/** Số tổ chức theo trạng thái thuê bao, cho tổng quan Console (checklist ALG 9.8). */
export async function subscriptionStatusCounts(): Promise<{ total: number; active: number; overdue: number; cancelled: number }> {
  const [total, groups] = await Promise.all([
    prisma.organizations.count(),
    prisma.subscriptions.groupBy({ by: ["status"], _count: { _all: true } }),
  ])
  const n = (s: string) => groups.find((g) => g.status === s)?._count._all ?? 0
  return { total, active: n("ACTIVE"), overdue: n("OVERDUE"), cancelled: n("CANCELLED") }
}

/** Hoá đơn đã thu trong khoảng thời gian (doanh thu thuê bao theo kỳ). */
export function paidInvoicesBetween(from: Date, to: Date) {
  return prisma.subscription_invoices.findMany({
    where: { status: "PAID", paid_at: { gte: from, lt: to } }, select: { amount_vnd: true, paid_at: true },
  })
}
