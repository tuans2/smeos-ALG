/**
 * Lõi phân giải quản trị phân tầng dùng chung (PO 30/10/2026 — phương án 2, nợ #193).
 *
 * Một quy luật cho mọi hệ thống có tầng (ma trận quản trị, thông báo…):
 *   1. KHOÁ: khoá của tầng cao nhất thắng (MOTHER → INDUSTRY → CHAIN → STORE);
 *      cùng tầng thì khoá đứng trước trong danh sách thắng.
 *   2. GHI ĐÈ: không có khoá → thiết lập cụ thể nhất thắng (người gọi xếp từ cụ thể nhất).
 *   3. MẶC ĐỊNH: không có gì → giá trị dự phòng.
 *
 * Phần riêng của từng hệ thống (cổng kích hoạt kênh, phạm vi khoá, mức ưu tiên…) nằm ở
 * module đó; module chỉ chuẩn bị danh sách khoá/ghi đè rồi gọi lõi này.
 * Thuần: không import Prisma hay module nghiệp vụ.
 */

export const GOVERNANCE_TIERS = ["MOTHER", "INDUSTRY", "CHAIN", "STORE"] as const
export type GovernanceTier = (typeof GOVERNANCE_TIERS)[number]

export function tierRank(tier: GovernanceTier): number {
  return GOVERNANCE_TIERS.indexOf(tier)
}

/** `a` nằm trên `b` (gần MOTHER hơn). */
export function isAbove(a: GovernanceTier, b: GovernanceTier): boolean {
  return tierRank(a) < tierRank(b)
}

export interface LayerLock<V, S extends string> {
  readonly tier: GovernanceTier
  readonly value: V
  readonly source: S
}

export interface LayerOverride<V, S extends string> {
  readonly value: V | null | undefined
  readonly source: S
}

export interface LayeredDecision<V, S extends string> {
  readonly value: V
  readonly source: S
  /** Tầng đặt khoá đang áp; `null` khi kết quả không đến từ khoá. */
  readonly lockedBy: GovernanceTier | null
}

/** Khoá thắng: tầng cao nhất; cùng tầng → đứng trước. `null` nếu không có khoá. */
export function winningLock<L extends { readonly tier: GovernanceTier }>(locks: readonly L[]): L | null {
  let best: L | null = null
  for (const lock of locks) {
    if (best === null || tierRank(lock.tier) < tierRank(best.tier)) best = lock
  }
  return best
}

export function resolveLayered<V, S extends string>(input: {
  readonly locks: readonly LayerLock<V, S>[]
  /** Xếp từ cụ thể nhất tới chung nhất; phần tử `value` null/undefined bị bỏ qua. */
  readonly overrides: readonly LayerOverride<V, S>[]
  readonly fallback: { readonly value: V; readonly source: S }
}): LayeredDecision<V, S> {
  const lock = winningLock(input.locks)
  if (lock) return { value: lock.value, source: lock.source, lockedBy: lock.tier }
  for (const o of input.overrides) {
    if (o.value !== null && o.value !== undefined) return { value: o.value, source: o.source, lockedBy: null }
  }
  return { value: input.fallback.value, source: input.fallback.source, lockedBy: null }
}
