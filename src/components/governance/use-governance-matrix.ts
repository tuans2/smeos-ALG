"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  emptyDecisions,
  type GovernanceDecisions,
  type GovernanceLayerTier,
  type UpperLayer,
} from "@/modules/organization/domain/governance-decisions"
import { applyGovernanceDecisions, nextDecisions } from "./apply-governance-decisions"
import type { GovernanceMatrixGroup } from "./governance-matrix-types"

type View = { tier: GovernanceLayerTier; own: GovernanceDecisions; upper: UpperLayer[] }

/**
 * Tải + lưu quyết định ma trận của tầng đang xem. `endpoint` là API tenant hoặc API nền tảng (Mẹ).
 * Lưu thất bại → trả lại trạng thái trước và báo lỗi.
 */
export function useGovernanceMatrix(endpoint: string, system: string, base: readonly GovernanceMatrixGroup[], fallbackTier: GovernanceLayerTier) {
  const [view, setView] = useState<View>({ tier: fallbackTier, own: emptyDecisions(), upper: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const url = `${endpoint}?system=${encodeURIComponent(system)}`

  useEffect(() => {
    let alive = true
    fetch(url)
      .then(async (res) => {
        const json = await res.json().catch(() => null)
        if (!alive) return
        if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Không tải được ma trận")
        setView({ tier: json.data.tier, own: json.data.own, upper: json.data.upper ?? [] })
        setError(null)
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "Không tải được ma trận"))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [url])

  const groups = useMemo(() => applyGovernanceDecisions(base, view.own, view.tier, view.upper), [base, view])

  const save = useCallback(
    async (action: Parameters<typeof nextDecisions>[1]) => {
      const previous = view
      const own = nextDecisions(view.own, action)
      setView({ ...view, own })
      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decisions: own }),
        })
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error?.message ?? "Không lưu được thay đổi")
        setError(null)
      } catch (e) {
        setView(previous)
        setError(e instanceof Error ? e.message : "Không lưu được thay đổi")
      }
    },
    [url, view]
  )

  const enabledOf = (key: string) => groups.flatMap((g) => g.items).find((i) => i.key === key)?.enabled ?? true

  return {
    groups,
    tier: view.tier,
    loading,
    error,
    toggleItem: (key: string, enabled: boolean) => save({ kind: "toggle", key, enabled }),
    resetItem: (key: string) => save({ kind: "reset", key }),
    toggleLock: (key: string, locked: boolean) => save({ kind: "lock", key, locked, enabled: enabledOf(key) }),
  }
}
