"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { INITIAL_PRODUCT_LIST_URL, PRODUCT_PAGE_SIZE, type ProductListPage } from "./product-list-page"

export { INITIAL_PRODUCT_LIST_URL, type ProductListPage }

const SEARCH_DEBOUNCE_MS = 300

type Page<T> = ProductListPage<T>

/** Lọc Dịp/Khoảng giá/Sắp xếp — máy chủ áp cho toàn kho (`scan-products.ts`). */
export interface ServerScanFilters {
  occasion: string
  priceRange: string
  customMinPrice: number | null
  customMaxPrice: number | null
  sortBy: string
}

/**
 * Danh sách sản phẩm phía server: tìm kiếm (debounce 300ms) + danh mục + "tải thêm" theo cursor.
 * Mỗi lần tải mới huỷ yêu cầu cũ (AbortController) — gõ nhanh không bị kết quả cũ ghi đè kết quả mới.
 * `initial`: trang đầu máy chủ đã tải cho `INITIAL_PRODUCT_LIST_URL` — dùng ngay, không gọi lại API lần đầu.
 */
export function useProductList<T extends { id: string }>(
  search: string,
  category: string | null,
  proposal: string | null = null,
  scan: ServerScanFilters | null = null,
  initial: Page<T> | null = null
) {
  const router = useRouter()
  const [items, setItems] = useState<T[] | null>(initial?.data ?? null)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(initial?.next_cursor ?? null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [total, setTotal] = useState<{ count: number; truncated: boolean } | null>(
    typeof initial?.total === "number" ? { count: initial.total, truncated: initial.truncated === true } : null
  )
  const initialPending = useRef(initial !== null)
  const [debounced, setDebounced] = useState(search)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  const buildUrl = useCallback((cursor?: string | null) => {
    const params = new URLSearchParams({ limit: PRODUCT_PAGE_SIZE })
    if (debounced.trim()) params.set("search", debounced.trim())
    if (category) params.set("category", category)
    if (proposal) params.set("proposal", proposal)
    if (scan && scan.occasion !== "all") params.set("occasion", scan.occasion)
    if (scan && scan.priceRange !== "all") {
      params.set("price_range", scan.priceRange)
      if (scan.priceRange === "custom" && scan.customMinPrice !== null) params.set("price_min", String(scan.customMinPrice))
      if (scan.priceRange === "custom" && scan.customMaxPrice !== null) params.set("price_max", String(scan.customMaxPrice))
    }
    if (scan && scan.sortBy !== "default") params.set("sort", scan.sortBy)
    if (cursor) params.set("cursor", cursor)
    return `/api/v1/products?${params.toString()}`
  }, [debounced, category, proposal, scan?.occasion, scan?.priceRange, scan?.customMinPrice, scan?.customMaxPrice, scan?.sortBy]) // eslint-disable-line react-hooks/exhaustive-deps -- so theo từng giá trị, không theo object

  const fetchPage = useCallback(async (cursor: string | null): Promise<Page<T> | null> => {
    controller.current?.abort()
    const ctrl = new AbortController()
    controller.current = ctrl
    const res = await fetch(buildUrl(cursor), { signal: ctrl.signal })
    if (res.status === 401) {
      router.push("/dang-nhap" as never)
      return null
    }
    if (!res.ok) throw new Error(`Không tải được danh sách (${res.status})`)
    return (await res.json()) as Page<T>
  }, [buildUrl, router])

  const reload = useCallback(async () => {
    setError(null)
    setItems(null)
    setNextCursor(null)
    try {
      const page = await fetchPage(null)
      if (!page) return
      setItems(page.data)
      setNextCursor(page.next_cursor)
      setTotal(typeof page.total === "number" ? { count: page.total, truncated: page.truncated === true } : null)
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return
      setError(e instanceof Error ? e.message : "Không tải được danh sách sản phẩm")
    }
  }, [fetchPage])

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    try {
      const page = await fetchPage(nextCursor)
      if (!page) return
      setItems((prev) => [...(prev ?? []), ...page.data])
      setNextCursor(page.next_cursor)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Không tải thêm được, vui lòng thử lại")
    } finally {
      setLoadingMore(false)
    }
  }, [fetchPage, nextCursor, loadingMore])

  useEffect(() => {
    // Lần đầu, bộ lọc trùng trang máy chủ đã render: giữ dữ liệu sẵn có.
    if (initialPending.current) {
      initialPending.current = false
      if (buildUrl(null) === INITIAL_PRODUCT_LIST_URL) return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi đổi tìm kiếm/danh mục; setState nằm trong hàm tải (nợ #149)
    void reload()
    return () => controller.current?.abort()
  }, [reload, buildUrl])

  const removeLocal = useCallback((id: string) => setItems((prev) => (prev ? prev.filter((p) => p.id !== id) : prev)), [])

  return { items, error, nextCursor, loadingMore, reload, loadMore, removeLocal, total }
}
