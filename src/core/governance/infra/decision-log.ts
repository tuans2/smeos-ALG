/**
 * Ghi/đọc bảng quyết định theo tầng `governance_decisions` (ADR-012 D-T10).
 *
 * Nguồn duy nhất của ma trận quản trị, khoá cứng + hiển thị thông báo, khoá tích hợp: ghi qua `recordDecisions` /
 * `syncDecisionScope`, đọc qua `currentDecisions`. Lịch sử: T-7a ghi kép, T-7b chuyển đọc, T-7c bỏ nơi lưu cũ.
 */
import { Prisma, type PrismaClient } from "@/generated/prisma/client"

import {
  diffDecisions,
  identityKey,
  sameDecisionValue,
  type DecisionRecord,
  type DecisionSystem,
  type DecisionValue,
} from "../decision-record"
import type { GovernanceTier } from "../layered-resolver"

type Db = PrismaClient | Prisma.TransactionClient

/** Giới hạn đọc một phạm vi — một ma trận tối đa 500 khoá × 2 (`MAX_GOVERNANCE_KEYS`), dư cho dòng gỡ. */
const MAX_SCOPE_ROWS = 5000

type Row = {
  system: string
  decision_key: string
  tier: string
  scope: string
  locked: boolean
  value: unknown
  decided_by: string | null
}

function toRecord(r: Row): DecisionRecord {
  return {
    system: r.system as DecisionSystem,
    decisionKey: r.decision_key,
    tier: r.tier as GovernanceTier,
    scope: r.scope,
    locked: r.locked,
    value: (r.value ?? null) as DecisionValue | null,
    decidedBy: r.decided_by,
  }
}

function toData(r: DecisionRecord): Prisma.governance_decisionsCreateManyInput {
  return {
    system: r.system,
    decision_key: r.decisionKey,
    tier: r.tier,
    scope: r.scope,
    locked: r.locked,
    // `value` null = đã gỡ; Prisma cần DbNull để ghi NULL của SQL vào cột Json
    value: r.value === null ? Prisma.DbNull : (r.value as Prisma.InputJsonValue),
    decided_by: r.decidedBy,
  }
}

/** Dòng mới nhất của mỗi quyết định trong `rows` (đã xếp `version` giảm dần). */
function latestPerIdentity(rows: readonly Row[]): DecisionRecord[] {
  const seen = new Set<string>()
  const out: DecisionRecord[] = []
  for (const r of rows) {
    const rec = toRecord(r)
    const key = identityKey(rec)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(rec)
  }
  return out
}

/** Thêm từng bản ghi khi giá trị khác dòng hiện hành của nó (gỡ một quyết định chưa có → bỏ qua). */
export async function recordDecisions(db: Db, records: readonly DecisionRecord[]): Promise<number> {
  const changed: DecisionRecord[] = []
  for (const r of records) {
    const latest = await db.governance_decisions.findFirst({
      where: { system: r.system, decision_key: r.decisionKey, tier: r.tier, scope: r.scope, locked: r.locked },
      orderBy: { version: "desc" },
      select: { value: true },
    })
    const before = (latest?.value ?? null) as DecisionValue | null
    if (!sameDecisionValue(before, r.value)) changed.push(r)
  }
  if (changed.length > 0) await db.governance_decisions.createMany({ data: changed.map(toData) })
  return changed.length
}

/**
 * Đưa TOÀN BỘ quyết định của (`system`, `scope`) về `desired` — dùng cho ma trận quản trị, nơi mỗi lần lưu thay cả tập
 * ghi đè + khoá của một phạm vi. Mục bị bỏ khỏi tập thành dòng gỡ — kể cả dòng ghi dưới tầng cũ (tổ chức đổi loại).
 */
export async function syncDecisionScope(
  db: Db,
  target: { readonly system: DecisionSystem; readonly scope: string },
  desired: readonly DecisionRecord[],
  decidedBy: string | null,
): Promise<number> {
  const rows = await db.governance_decisions.findMany({
    where: { system: target.system, scope: target.scope },
    orderBy: { version: "desc" },
    take: MAX_SCOPE_ROWS,
  })
  const current = latestPerIdentity(rows)
  const changes = diffDecisions(current, desired).map((c) => (c.value === null ? { ...c, decidedBy } : c))
  if (changes.length > 0) await db.governance_decisions.createMany({ data: changes.map(toData) })
  return changes.length
}

/** Bộ lọc đọc: mọi trường tuỳ chọn; danh sách rỗng = không khớp gì. */
export interface DecisionFilter {
  readonly systems?: readonly DecisionSystem[] | undefined
  readonly scopes?: readonly string[] | undefined
  readonly tier?: GovernanceTier | undefined
  readonly decisionKey?: string | undefined
}

/**
 * Quyết định đang hiệu lực (bỏ dòng gỡ) — nguồn đọc của ma trận, thông báo, tích hợp từ T-7b. Dòng mới nhất của mỗi
 * quyết định thắng, kể cả khi đó là dòng gỡ (quyết định đã gỡ không "sống lại" từ dòng cũ hơn).
 */
export async function currentDecisions(db: Db, filter: DecisionFilter = {}): Promise<DecisionRecord[]> {
  if (filter.systems?.length === 0 || filter.scopes?.length === 0) return []
  const rows = await db.governance_decisions.findMany({
    where: {
      ...(filter.systems ? { system: { in: [...filter.systems] } } : {}),
      ...(filter.scopes ? { scope: { in: [...filter.scopes] } } : {}),
      ...(filter.tier ? { tier: filter.tier } : {}),
      ...(filter.decisionKey ? { decision_key: filter.decisionKey } : {}),
    },
    orderBy: { version: "desc" },
    take: MAX_SCOPE_ROWS,
  })
  return latestPerIdentity(rows).filter((r) => r.value !== null)
}
