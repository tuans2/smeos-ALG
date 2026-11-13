/**
 * TIER GOVERNANCE MATRIX CLIENT
 *
 * Client Component dùng chung cho cả 3 tầng dưới:
 * - SaaS Ngành (INDUSTRY)
 * - ChainOS (CHAIN)
 * - StoreOS (STORE)
 *
 * Tự động phân cấp:
 * - Khóa cứng nếu tầng trên (Mother / Chain) đã khóa
 * - Hiển thị badge nguồn gốc kế thừa
 * - Cho phép Admin Chuỗi / Ngành đặt khóa cứng xuống đơn vị trực thuộc
 * - Cho phép Điểm bán (Store) ghi đè Delta cục bộ hoặc bấm Reset về mặc định
 */
"use client"

import { useMemo } from "react"
import { GovernanceMatrixTable } from "@/components/governance/governance-matrix-table"
import type { GovernanceMatrixState, GovernanceViewerTier } from "@/components/governance/governance-matrix-types"
import { buildSSOTGovernanceGroups, type GovernanceSystemKey } from "./governance-catalog-registry"
import { useGovernanceMatrix } from "./use-governance-matrix"
import { GovernanceScopeNote } from "./governance-scope-note"
import { useSession } from "@/lib/session"
import { PageHeader } from "@/components/ui/page-header"

interface TierGovernanceMatrixClientProps {
  systemKey: GovernanceSystemKey
  title: string
  description: string
}

export function TierGovernanceMatrixClient({ systemKey, title, description }: TierGovernanceMatrixClientProps) {
  const { organizationType, organization } = useSession()
  // Tầng thật do máy chủ trả về; giá trị này chỉ dùng trong lúc tải
  const fallbackTier: GovernanceViewerTier =
    organizationType === "CHAIN" ? "CHAIN" : "STORE"
  const industryKey = organization?.industry ?? "FLORAL"

  const base = useMemo(
    () => buildSSOTGovernanceGroups({ systemKey, viewerTier: fallbackTier, industryKey, storePoliciesRaw: null }),
    [systemKey, fallbackTier, industryKey]
  )
  const matrix = useGovernanceMatrix("/api/v1/organizations/current/governance-matrix", systemKey, base, fallbackTier)
  const { groups } = matrix

  const currentState: GovernanceMatrixState = {
    systemKey,
    systemTitle: title,
    viewerTier: matrix.tier,
    scopeId: organization?.id ?? "CURRENT_ORG",
    groups,
    totalItems: groups.reduce((acc, g) => acc + g.items.length, 0),
    lockedCount: groups.reduce((acc, g) => acc + g.items.filter((i) => i.isLocked).length, 0),
    overrideCount: groups.reduce((acc, g) => acc + g.items.filter((i) => i.hasLocalOverride).length, 0),
    loading: matrix.loading,
    error: matrix.error,
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full p-6">
      <div>
        {/* Tiêu đề ngắn; mô tả trong "?" (OPERATING_PRINCIPLES §6.1) */}
        <PageHeader
          title={title}
          tip={<>{description}</>}
        />
      </div>

      <GovernanceScopeNote system={systemKey} />

      {matrix.error && (
        <p role="alert" className="rounded-xl border border-danger-border bg-danger-bg px-4 py-2.5 text-body-sm text-danger-text">
          {matrix.error}
        </p>
      )}

      <GovernanceMatrixTable
        state={currentState}
        canManageHardLocks={matrix.tier === "CHAIN"}
        onToggleItem={matrix.toggleItem}
        onResetItem={matrix.resetItem}
        onToggleLock={matrix.toggleLock}
      />
    </div>
  )
}
