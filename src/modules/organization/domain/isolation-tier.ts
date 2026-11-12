/**
 * Mức cô lập của tổ chức (ADR-016 D-S2, bước S-5). Gói thuê bao quyết định mức được phép — PO chốt 12/11/2026 "theo
 * quy mô": Trải nghiệm / Starter / Pro (và tổ chức chưa có thuê bao) chỉ dùng chung; Mạng lưới thêm `SHARED_PLUS`;
 * Doanh nghiệp được cả ba. Không import hạ tầng.
 */
export const ISOLATION_TIERS = ["SHARED", "SHARED_PLUS", "DEDICATED"] as const
export type IsolationTier = (typeof ISOLATION_TIERS)[number]

export const ISOLATION_TIER_LABEL: Record<IsolationTier, string> = {
  SHARED: "Dùng chung",
  SHARED_PLUS: "Dùng chung, khôi phục riêng",
  DEDICATED: "Triển khai riêng",
}

const BY_PLAN: Record<string, readonly IsolationTier[]> = {
  EXPERIENCE: ["SHARED"],
  STARTER: ["SHARED"],
  PRO: ["SHARED"],
  FLOWER_NETWORK: ["SHARED", "SHARED_PLUS"],
  ENTERPRISE: ["SHARED", "SHARED_PLUS", "DEDICATED"],
}

/** Mức được phép theo gói đang hiệu lực (`null` = chưa có thuê bao hoặc đã huỷ). Gói lạ → chỉ dùng chung. */
export function allowedIsolationTiers(plan: string | null): readonly IsolationTier[] {
  return (plan ? BY_PLAN[plan] : undefined) ?? ["SHARED"]
}

export function isIsolationTierAllowed(plan: string | null, tier: IsolationTier): boolean {
  return allowedIsolationTiers(plan).includes(tier)
}

/** Lý do chặn khi đổi gói / huỷ thuê bao làm mức hiện tại không còn được phép, hoặc `null`. */
export function planChangeBlockedReason(currentTier: IsolationTier, nextPlan: string | null): string | null {
  if (isIsolationTierAllowed(nextPlan, currentTier)) return null
  return `Tổ chức đang ở mức "${ISOLATION_TIER_LABEL[currentTier]}" mà gói mới không cho phép — hạ mức cô lập trước`
}
