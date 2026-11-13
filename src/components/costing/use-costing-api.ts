"use client"

import { useCallback, useEffect, useState } from "react"
import type { IndustryCostingSpec } from "@/modules/organization/domain/industry-costing-spec"
import type { CostConfig } from "@/modules/costing/domain/costing-types"

export interface CostingProfile {
  supported: boolean
  industryKey: string
  spec: IndustryCostingSpec | null
  config: CostConfig | null
}

export type LoadState<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T }

/** Đọc JSON `{ data }` từ API tính giá; lỗi trả thông điệp nghiệp vụ, không lộ mã nội bộ. */
export async function costingFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const body = (await res.json().catch(() => null)) as { data?: T; message?: string } | null
  if (!res.ok) {
    if (res.status === 403) throw new Error("Bạn chưa có quyền dùng chức năng này.")
    if (res.status === 404) throw new Error("Không tìm thấy dữ liệu này.")
    throw new Error(body?.message ?? "Chưa xử lý được yêu cầu. Hãy thử lại.")
  }
  return body?.data as T
}

/** Tải một tài nguyên tính giá, có `reload` để thử lại sau lỗi hoặc sau khi lưu. */
export function useCostingResource<T>(url: string | null) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" })
  const [nonce, setNonce] = useState(0)
  useEffect(() => {
    if (!url) return
    let alive = true
    costingFetch<T>(url)
      .then((data) => alive && setState({ status: "ready", data }))
      .catch((e: unknown) => alive && setState({ status: "error", message: e instanceof Error ? e.message : "Chưa tải được dữ liệu." }))
    return () => {
      alive = false
    }
  }, [url, nonce])
  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { state, reload }
}

export const formatVnd = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${Math.round(v).toLocaleString("vi-VN")} đ`
