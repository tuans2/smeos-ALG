"use client"

import useSWR, { type SWRConfiguration } from "swr"
import useSWRInfinite from "swr/infinite"
import { readApiError } from "@/components/greeting-card/api-error"

/**
 * Tầng gọi API phía client của Thẻ chào — SWR thay cho `useEffect + fetch`
 * (anti-pattern A6): khử trùng lặp request, tự làm mới khi quay lại tab,
 * không có race giữa các lần tải.
 */

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(await readApiError(res, "Không tải được dữ liệu"))
  return (await res.json()) as T
}

/** POST/PUT/PATCH/DELETE — ném `Error` mang thông báo tiếng Việt của server. */
export async function apiSend<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  fallback = "Thao tác không thành công"
): Promise<T> {
  const init: RequestInit =
    body === undefined
      ? { method }
      : { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(await readApiError(res, fallback))
  return (await res.json().catch(() => ({}))) as T
}

export function useApi<T>(url: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(url, apiGet, { revalidateOnFocus: true, ...config })
}

interface Page<T> {
  data: T[]
  next_cursor: string | null
}

/** Danh sách phân trang con trỏ `{ data, next_cursor }` + nút "Tải thêm". */
export function usePagedList<T>(baseUrl: string | null, pageSize = 20) {
  const swr = useSWRInfinite<Page<T>>(
    (index, previous) => {
      if (!baseUrl) return null
      if (previous && !previous.next_cursor) return null
      const sep = baseUrl.includes("?") ? "&" : "?"
      const cursor = index === 0 || !previous?.next_cursor ? "" : `&cursor=${encodeURIComponent(previous.next_cursor)}`
      return `${baseUrl}${sep}limit=${pageSize}${cursor}`
    },
    apiGet,
    { revalidateOnFocus: true, revalidateFirstPage: true }
  )
  const pages = swr.data ?? []
  const items = pages.flatMap((p) => p.data)
  const hasMore = pages.length > 0 && pages[pages.length - 1]?.next_cursor !== null
  return {
    items,
    hasMore,
    isLoading: swr.isLoading,
    isLoadingMore: swr.isValidating && swr.size > pages.length,
    error: swr.error as Error | undefined,
    loadMore: () => swr.setSize(swr.size + 1),
    refresh: () => swr.mutate(),
  }
}
