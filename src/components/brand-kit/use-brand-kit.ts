"use client"

import { useCallback, useEffect, useState } from "react"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"
import type { GenerationMode } from "@/modules/brand-kit/domain/option-rules"

export type BrandKitKind = "identity" | "landing"

interface ApiError { error?: { message?: string; details?: Record<string, unknown> } }

/** Lỗi máy chủ → câu tiếng Việt cho người dùng (ưu tiên lý do khoá bước / thiếu credit). */
async function errorMessage(res: Response): Promise<string> {
  const j = (await res.json().catch(() => null)) as ApiError | null
  const step = j?.error?.details?.step
  if (typeof step === "string") return step
  if (res.status === 403) return "Bạn chưa có quyền thực hiện thao tác này"
  return j?.error?.message || "Chưa thực hiện được, vui lòng thử lại"
}

export interface BrandKitState {
  view: BrandKitView | null
  loading: boolean
  error: string | null
  busy: string | null
  notice: string | null
  reload: () => Promise<void>
  generate: (kind: BrandKitKind, mode: GenerationMode) => Promise<boolean>
  select: (kind: BrandKitKind, id: string) => Promise<string | null>
  clearNotice: () => void
}

export function useBrandKit(): BrandKitState {
  const [view, setView] = useState<BrandKitView | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch("/api/v1/brand-kit")
      if (!res.ok) throw new Error(await errorMessage(res))
      setView(((await res.json()) as { data: BrandKitView }).data)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được mục Thương hiệu")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount; setState nằm trong hàm tải (nợ #149)
    void reload()
  }, [reload])

  const generate = useCallback(async (kind: BrandKitKind, mode: GenerationMode) => {
    setBusy(`${kind}:${mode}`)
    setNotice(null)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      // Một lần bấm = một khoá: bấm lại do mạng chập chờn không bị trừ credit hai lần
      if (mode === "extra") headers["Idempotency-Key"] = crypto.randomUUID()
      const res = await fetch(`/api/v1/brand-kit/${kind}-options`, { method: "POST", headers, body: JSON.stringify({ mode }) })
      if (!res.ok) {
        setNotice(await errorMessage(res))
        return false
      }
      const j = (await res.json()) as { data?: { usage?: { refunded?: boolean } | null } }
      if (j.data?.usage?.refunded) setNotice("AI tạm thời chưa viết được — đã tạo phương án theo mẫu và hoàn lại credit")
      await reload()
      return true
    } finally {
      setBusy(null)
    }
  }, [reload])

  const select = useCallback(async (kind: BrandKitKind, id: string) => {
    setBusy(`${kind}:select:${id}`)
    setNotice(null)
    try {
      const res = await fetch(`/api/v1/brand-kit/${kind}-options/${encodeURIComponent(id)}/select`, { method: "POST" })
      if (!res.ok) {
        setNotice(await errorMessage(res))
        return null
      }
      const j = (await res.json()) as { data?: { path?: string } }
      await reload()
      return j.data?.path ?? id
    } finally {
      setBusy(null)
    }
  }, [reload])

  return { view, loading, error, busy, notice, reload, generate, select, clearNotice: () => setNotice(null) }
}
