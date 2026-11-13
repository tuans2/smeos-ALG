"use client"

import { useEffect, useState } from "react"

import type { LibraryType } from "@/modules/storage/domain/library"

export type LibrarySummary = {
  types: LibraryType[]
  counts: Partial<Record<LibraryType, number>>
  isChain: boolean
  viewerBranchId: string | null
  branches: { id: string; name: string }[]
  /** `all` | `hq` | id chi nhánh — Screen Contract `kho-du-lieu.md` §5. */
  scope: string
  setScope: (scope: string) => void
  refreshKey: number
  refresh: () => void
}

type SummaryBody = {
  data: {
    types: LibraryType[]
    counts: Partial<Record<LibraryType, number>>
    is_chain: boolean
    viewer_branch_id: string | null
    branches: { id: string; name: string }[]
  }
}

/** Tóm tắt Kho dữ liệu v2 (`GET /api/v1/storage/library/summary`), tải lại khi đổi phạm vi hoặc làm mới. */
export function useLibrarySummary(): LibrarySummary {
  const [scope, setScope] = useState("all")
  const [refreshKey, setRefreshKey] = useState(0)
  const [data, setData] = useState<SummaryBody["data"]>({ types: [], counts: {}, is_chain: false, viewer_branch_id: null, branches: [] })

  useEffect(() => {
    let alive = true
    fetch(`/api/v1/storage/library/summary?scope=${encodeURIComponent(scope)}`)
      .then((res) => (res.ok ? (res.json() as Promise<SummaryBody>) : null))
      .then((body) => {
        if (alive && body) setData(body.data)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [scope, refreshKey])

  return {
    types: data.types,
    counts: data.counts,
    isChain: data.is_chain,
    viewerBranchId: data.viewer_branch_id,
    branches: data.branches,
    scope,
    setScope,
    refreshKey,
    refresh: () => setRefreshKey((n) => n + 1),
  }
}
