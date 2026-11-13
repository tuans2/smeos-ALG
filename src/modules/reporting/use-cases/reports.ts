import type { TenantContext } from "@/core/tenancy/tenant-context"
import { requireCapability } from "@/core/rbac/capabilities"
import { validationFailed } from "@/core/http/errors"
import { parsePeriod, type ReportPeriod } from "../domain/report-period"
import { buildOrderReport, buildRevenueReport } from "../domain/order-revenue-report"
import { buildPerformanceReport, buildProductReport } from "../domain/product-performance-report"
import { buildCashflowReport } from "../domain/cashflow-report"
import {
  assignmentsOfOrdersIn, bankEventsIn, itemsOfOrdersIn, memberDirectory, ordersCreatedIn, ordersForDrilldown, paymentsCollectedIn,
} from "../infra/report-repository"

/**
 * Báo cáo theo kỳ (Đợt 5, checklist ALG 6.1, 6.2, 6.3, 6.5, 6.6) — năng lực `R20` (Điều hành, Kế toán).
 * Tổ chức từ phiên, phạm vi chi nhánh theo người xem; kỳ theo giờ Việt Nam, tối đa 366 ngày.
 */

export interface PeriodQuery { from?: string | null; to?: string | null; granularity?: string | null; detail?: string | null }

function periodOrThrow(ctx: TenantContext, q: PeriodQuery): ReportPeriod {
  requireCapability(ctx, "R20")
  const p = parsePeriod(q)
  if (!p) throw validationFailed({ period: "Kỳ báo cáo không hợp lệ (YYYY-MM-DD, từ ngày ≤ đến ngày, tối đa 366 ngày)" })
  return p
}

export async function getOrderReport(ctx: TenantContext, q: PeriodQuery) {
  const p = periodOrThrow(ctx, q)
  return buildOrderReport(await ordersCreatedIn(ctx, p), p)
}

export async function getRevenueReport(ctx: TenantContext, q: PeriodQuery) {
  const p = periodOrThrow(ctx, q)
  const [orders, payments] = await Promise.all([ordersCreatedIn(ctx, p), paymentsCollectedIn(ctx, p)])
  const report = buildRevenueReport(orders, payments, p)
  if (q.detail !== "orders") return report
  const list = await ordersForDrilldown(ctx, p, { cancelled: false })
  return {
    ...report,
    orders: list.map((o) => ({ id: o.id, code: o.code, status: o.status, totalVnd: Number(o.total_vnd), paidVnd: Number(o.paid_vnd), createdAt: o.created_at.toISOString() })),
  }
}

export async function getProductReport(ctx: TenantContext, q: PeriodQuery) {
  const p = periodOrThrow(ctx, q)
  return { period: { from: p.from, to: p.to }, ...buildProductReport(await itemsOfOrdersIn(ctx, p)) }
}

export async function getPerformanceReport(ctx: TenantContext, q: PeriodQuery) {
  const p = periodOrThrow(ctx, q)
  const [orders, assignments, members] = await Promise.all([ordersCreatedIn(ctx, p), assignmentsOfOrdersIn(ctx, p), memberDirectory(ctx)])
  return { period: { from: p.from, to: p.to }, ...buildPerformanceReport(orders, assignments, members) }
}

export async function getCashflowReport(ctx: TenantContext, q: PeriodQuery) {
  const p = periodOrThrow(ctx, q)
  const [payments, bank] = await Promise.all([paymentsCollectedIn(ctx, p), bankEventsIn(ctx, p)])
  return { period: { from: p.from, to: p.to }, ...buildCashflowReport(payments, bank, p) }
}
