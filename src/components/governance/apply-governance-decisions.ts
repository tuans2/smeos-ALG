/**
 * Áp quyết định đã lưu (tầng đang xem + các tầng trên) lên danh mục ma trận dựng từ registry.
 */
import {
  effectiveDecision,
  type GovernanceDecisions,
  type GovernanceLayerTier,
  type UpperLayer,
} from "@/modules/organization/domain/governance-decisions"
import { GOVERNANCE_TIER_LABELS, type GovernanceMatrixGroup, type GovernanceMatrixItem } from "./governance-matrix-types"

const HARD_LOCK_SOURCE: Record<GovernanceLayerTier, GovernanceMatrixItem["decidedBy"]> = {
  MOTHER: "HARD_LOCK_MOTHER",
  INDUSTRY: "HARD_LOCK_INDUSTRY",
  CHAIN: "HARD_LOCK_CHAIN",
  STORE: "HARD_LOCK_STORE",
}

export function applyGovernanceDecisions(
  base: readonly GovernanceMatrixGroup[],
  own: GovernanceDecisions,
  ownTier: GovernanceLayerTier,
  upper: readonly UpperLayer[]
): GovernanceMatrixGroup[] {
  return base.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      const eff = effectiveDecision(item.key, item.enabled, own, ownTier, upper)
      const locked = eff.lockedBy !== null
      return {
        ...item,
        enabled: eff.enabled,
        isLocked: locked,
        hardLockedBy: eff.lockedBy,
        isOwnHardLock: eff.source === "OWN_LOCK",
        lockReason: locked ? `Khoá cứng bởi ${GOVERNANCE_TIER_LABELS[eff.lockedBy!]}` : item.lockReason,
        hasLocalOverride: eff.source === "OWN_OVERRIDE" || eff.source === "OWN_LOCK",
        decidedBy: locked ? HARD_LOCK_SOURCE[eff.lockedBy!] : eff.source === "OWN_OVERRIDE" ? ownTier === "MOTHER" ? "MOTHER_DEFAULT" : ownTier : item.decidedBy,
      }
    }),
  }))
}

/** Quyết định mới sau một thao tác trên ô (bật/tắt, đặt lại, khoá/mở khoá). */
export function nextDecisions(
  own: GovernanceDecisions,
  action: { kind: "toggle"; key: string; enabled: boolean } | { kind: "reset"; key: string } | { kind: "lock"; key: string; locked: boolean; enabled: boolean }
): GovernanceDecisions {
  const overrides = { ...own.overrides }
  const locks = { ...own.locks }
  if (action.kind === "toggle") {
    if (locks[action.key]) locks[action.key] = { enabled: action.enabled }
    else overrides[action.key] = action.enabled
  } else if (action.kind === "reset") {
    delete overrides[action.key]
    delete locks[action.key]
  } else if (action.locked) {
    locks[action.key] = { enabled: action.enabled }
  } else {
    delete locks[action.key]
  }
  return { overrides, locks }
}
