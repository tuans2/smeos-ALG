/**
 * UNIVERSAL GOVERNANCE MATRIX TYPES
 * Dùng chung cho 4 tầng: Mother, Industry, Chain, Store.
 * Phục vụ hiển thị Ma trận Quản trị Phân tầng (Promotions, Commitments, Policies, Payment, Fees, Templates).
 */

import type { GovernanceTier } from "@/core/governance/layered-resolver"

export type GovernanceViewerTier = GovernanceTier

export const GOVERNANCE_TIER_LABELS: Record<GovernanceViewerTier, string> = {
  MOTHER: "Nền tảng Mẹ",
  INDUSTRY: "Quy chuẩn Ngành",
  CHAIN: "Chuỗi Thương hiệu",
  STORE: "Cửa hàng Cơ sở",
}

export interface GovernanceMatrixItem {
  key: string
  title: string
  description?: string | undefined
  groupKey: string
  groupTitle: string

  /** Trạng thái hiện tại */
  enabled: boolean
  config?: Record<string, unknown> | undefined

  /** Thông tin nguồn gốc quyết định */
  decidedBy:
    | "GLOBALLY_DEACTIVATED"
    | "HARD_LOCK_MOTHER"
    | "HARD_LOCK_INDUSTRY"
    | "HARD_LOCK_CHAIN"
    | "HARD_LOCK_STORE"
    | "STORE"
    | "CHAIN"
    | "INDUSTRY"
    | "MOTHER_DEFAULT"
    | "SYSTEM_FALLBACK"

  /** Trạng thái khóa */
  isLocked: boolean
  hardLockedBy: GovernanceViewerTier | null
  isOwnHardLock: boolean
  lockReason?: string | undefined

  /** Đã có override cục bộ hay đang kế thừa thuần túy */
  hasLocalOverride: boolean
}

export interface GovernanceMatrixGroup {
  groupKey: string
  groupTitle: string
  items: GovernanceMatrixItem[]
}

export interface GovernanceMatrixState {
  systemKey: string
  systemTitle: string
  viewerTier: GovernanceViewerTier
  scopeId: string
  groups: GovernanceMatrixGroup[]
  totalItems: number
  lockedCount: number
  overrideCount: number
  loading: boolean
  error: string | null
}
