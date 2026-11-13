import { prisma } from "@/core/tenancy/infra/prisma"
import { quotaExceeded } from "@/core/http/errors"
import type { DbClient } from "./db-client"
import { readCreditPricing } from "./credit-pricing-store"
import { creditPeriod, DEFAULT_PERIOD, reachesNearLimit, type LimitService } from "../domain/monthly-limit"

/**
 * Hạn mức credit theo tháng (checklist ALG 10.3, 9.7). Mọi lần trừ credit gọi `consumeMonthlyCredit` trong
 * cùng giao dịch: cộng `used` có điều kiện bằng một câu UPDATE (không vượt `monthly_limit`) — hai lượt đồng
 * thời không cùng lọt qua. Vượt → 422 `QUOTA_EXCEEDED`, giao dịch cha rollback. Tổ chức truyền vào là tổ
 * chức của phiên (bên gọi lấy từ `TenantContext`) hoặc tổ chức sở hữu kênh chat.
 */

interface LimitRow { id: string; used: number; monthly_limit: number | null; alerted_near: boolean }

async function ensureRow(db: DbClient, orgId: string, service: LimitService, period: string, fallback: number | null): Promise<void> {
  await db.$executeRaw`
    INSERT INTO usage_limits (id, organization_id, service, period, monthly_limit, used, updated_at)
    SELECT gen_random_uuid()::text, ${orgId}, ${service}, ${period},
      CASE WHEN EXISTS (SELECT 1 FROM usage_limits d WHERE d.organization_id = ${orgId} AND d.service = ${service} AND d.period = ${DEFAULT_PERIOD})
        THEN (SELECT d.monthly_limit FROM usage_limits d WHERE d.organization_id = ${orgId} AND d.service = ${service} AND d.period = ${DEFAULT_PERIOD})
        ELSE ${fallback}::int END,
      0, now()
    ON CONFLICT (organization_id, service, period) DO NOTHING`
}

async function addUsage(db: DbClient, orgId: string, service: LimitService, period: string, cost: number): Promise<LimitRow | null> {
  const rows = await db.$queryRaw<LimitRow[]>`
    UPDATE usage_limits SET used = used + ${cost}, updated_at = now()
    WHERE organization_id = ${orgId} AND service = ${service} AND period = ${period}
      AND (monthly_limit IS NULL OR used + ${cost} <= monthly_limit)
    RETURNING id, used, monthly_limit, alerted_near`
  return rows[0] ?? null
}

async function claimNear(db: DbClient, row: LimitRow): Promise<boolean> {
  if (row.alerted_near || !reachesNearLimit(row.used, row.monthly_limit)) return false
  const n = await db.$executeRaw`UPDATE usage_limits SET alerted_near = true WHERE id = ${row.id} AND alerted_near = false`
  return n > 0
}

export interface ConsumeResult { near: Array<{ service: LimitService; used: number; limit: number }>; creditLimit: number | null }

/** Cộng `cost` vào hạn mức tháng; `service` AI còn tính vào trần AI của cửa hàng. */
export async function consumeMonthlyCredit(db: DbClient, orgId: string, cost: number, service: string | null | undefined): Promise<ConsumeResult> {
  const period = creditPeriod()
  const pricing = await readCreditPricing(db)
  await ensureRow(db, orgId, "CREDIT", period, pricing.defaultMonthlyLimit)
  const near: ConsumeResult["near"] = []
  let ai: LimitRow | null = null
  if (service === "AI") {
    await ensureRow(db, orgId, "AI", period, null)
    ai = await addUsage(db, orgId, "AI", period, cost)
    if (!ai) throw quotaExceeded("Đã chạm trần credit AI tháng này của cửa hàng", { service: "AI", period })
  }
  const credit = await addUsage(db, orgId, "CREDIT", period, cost)
  if (!credit) {
    if (ai) await releaseMonthlyCredit(db, orgId, cost, "AI", ["AI"])
    throw quotaExceeded("Đã chạm hạn mức credit tháng này", { service: "CREDIT", period })
  }
  if (ai && (await claimNear(db, ai))) near.push({ service: "AI", used: ai.used, limit: ai.monthly_limit! })
  if (await claimNear(db, credit)) near.push({ service: "CREDIT", used: credit.used, limit: credit.monthly_limit! })
  return { near, creditLimit: credit.monthly_limit }
}

/** Tin nhắn thấu chi (PO 05/11/2026): vẫn cộng vào mức dùng của kỳ, không chặn theo hạn mức. */
export async function countMonthlyCreditUnchecked(db: DbClient, orgId: string, cost: number): Promise<void> {
  const period = creditPeriod()
  await ensureRow(db, orgId, "CREDIT", period, (await readCreditPricing(db)).defaultMonthlyLimit)
  await db.$executeRaw`UPDATE usage_limits SET used = used + ${cost}, updated_at = now()
    WHERE organization_id = ${orgId} AND service = 'CREDIT' AND period = ${period}`
}

/**
 * Hoàn credit → trừ lại phần đã tính vào hạn mức của kỳ chứa `chargedAt` (lúc đã trừ; mặc định bây giờ),
 * không xuống dưới 0. Job trừ tháng 10 mà hoàn tháng 11 phải trả lại tháng 10 (audit BL-17).
 */
export async function releaseMonthlyCredit(
  db: DbClient, orgId: string, amount: number, service: string | null | undefined,
  only: LimitService[] = service === "AI" ? ["CREDIT", "AI"] : ["CREDIT"],
  chargedAt: Date = new Date(),
): Promise<void> {
  if (amount <= 0) return
  const period = creditPeriod(chargedAt)
  for (const s of only) {
    await db.$executeRaw`UPDATE usage_limits SET used = GREATEST(used - ${amount}, 0), updated_at = now()
      WHERE organization_id = ${orgId} AND service = ${s} AND period = ${period}`
  }
}

/** Bật cờ "sắp hết credit" một lần mỗi kỳ; true = lần đầu trong kỳ. */
export async function claimLowBalanceAlert(db: DbClient, orgId: string): Promise<boolean> {
  const n = await db.$executeRaw`UPDATE usage_limits SET alerted_low = true
    WHERE organization_id = ${orgId} AND service = 'CREDIT' AND period = ${creditPeriod()} AND alerted_low = false`
  return n > 0
}

export async function lastTopupAmount(db: DbClient, orgId: string): Promise<number | null> {
  const row = await db.credit_transactions.findFirst({
    where: { organization_id: orgId, kind: "TOPUP" }, orderBy: { created_at: "desc" }, select: { amount: true },
  })
  return row?.amount ?? null
}

/** Đặt hạn mức (dòng DEFAULT cho các tháng sau và kỳ hiện tại). */
export async function setMonthlyLimit(orgId: string, service: LimitService, limit: number | null): Promise<void> {
  const period = creditPeriod()
  for (const p of [DEFAULT_PERIOD, period]) {
    await prisma.usage_limits.upsert({
      where: { organization_id_service_period: { organization_id: orgId, service, period: p } },
      create: { organization_id: orgId, service, period: p, monthly_limit: limit },
      // Nâng/hạ hạn mức giữa kỳ thì cho phép báo lại theo mức mới
      update: { monthly_limit: limit, alerted_near: false },
    })
  }
}

export interface MonthlySnapshot {
  period: string
  credit: { used: number; limit: number | null }
  ai: { used: number; limit: number | null }
}

export function monthlySnapshot(orgId: string): Promise<MonthlySnapshot> {
  return monthlySnapshotFor(orgId, creditPeriod())
}

/** Hạn mức và lượng đã dùng của một kỳ YYYY-MM bất kỳ (báo cáo theo kỳ, checklist ALG 6.9). */
export async function monthlySnapshotFor(orgId: string, period: string): Promise<MonthlySnapshot> {
  const [rows, pricing] = await Promise.all([
    prisma.usage_limits.findMany({ where: { organization_id: orgId, period: { in: [period, DEFAULT_PERIOD] } } }),
    readCreditPricing(),
  ])
  const pick = (service: LimitService, fallback: number | null) => {
    const cur = rows.find((r) => r.service === service && r.period === period)
    const def = rows.find((r) => r.service === service && r.period === DEFAULT_PERIOD)
    return { used: cur?.used ?? 0, limit: cur ? cur.monthly_limit : def ? def.monthly_limit : fallback }
  }
  return { period, credit: pick("CREDIT", pricing.defaultMonthlyLimit), ai: pick("AI", null) }
}

/** Credit đã dùng trong một kỳ (dòng CREDIT) — tính phần credit tặng theo gói hết hạn. */
export async function creditUsedInPeriod(db: DbClient, orgId: string, period: string): Promise<number> {
  const row = await db.usage_limits.findUnique({
    where: { organization_id_service_period: { organization_id: orgId, service: "CREDIT", period } }, select: { used: true },
  })
  return row?.used ?? 0
}
