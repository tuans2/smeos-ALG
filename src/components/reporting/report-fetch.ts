"use client"

import { useEffect, useState } from "react"

export interface PeriodState { from: string; to: string; granularity: "day" | "week" | "month" }

/** Tải một báo cáo theo kỳ (`/api/v1/reports/<loại>`); trả dữ liệu, lỗi và cờ đang tải. */
export function useReport<T>(kind: string, p: PeriodState, extra = "") {
  const [state, setState] = useState<{ data: T | null; error: string | null; key: string }>({ data: null, error: null, key: "" })
  const key = `${kind}?from=${p.from}&to=${p.to}&granularity=${p.granularity}${extra}`
  useEffect(() => {
    fetch(`/api/v1/reports/${key}`)
      .then(async (r) => {
        const j = (await r.json().catch(() => null)) as { data?: T; error?: { message?: string } } | null
        if (!r.ok || !j?.data) throw new Error(j?.error?.message ?? "Chưa tải được báo cáo")
        setState({ data: j.data, error: null, key })
      })
      .catch((e: unknown) => setState({ data: null, error: e instanceof Error ? e.message : "Chưa tải được báo cáo", key }))
  }, [key])
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : null, loading: state.key !== key }
}

export const bucketLabel = (b: string) => (b.length === 7 ? `${b.slice(5)}/${b.slice(0, 4)}` : `${b.slice(8)}/${b.slice(5, 7)}`)
export const pct = (v: number | null) => (v === null ? "—" : `${v}%`)
