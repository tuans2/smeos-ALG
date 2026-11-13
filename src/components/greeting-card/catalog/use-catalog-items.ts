"use client"

import { useState, useEffect, useRef } from "react"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { filterProducts } from "@/lib/product-filter"
import type { ProductFilterCriteria } from "@/lib/product-filter"
import { toInclusiveRange } from "@/lib/price-budgets"
import { usePriceBudgets } from "@/components/catalog/use-price-budgets"
import { useExcludedCatalogProducts, withoutProducts } from "./use-excluded-catalog-products"

export type AvailableProduct = {
  id: string
  name: string
  code: string
  category: string | null
  shape?: string | null | undefined
  /** URL ảnh chính — từ SSOT API `/api/v1/products`. `undefined` khi chưa có ảnh. */
  masterImageUrl?: string | undefined
  /** Giá tham chiếu — `null` = Liên hệ báo giá. */
  price_vnd: number | null
  /** Link Google Drive (import Excel) — fallback thumbnail khi chưa có ảnh storage. */
  driveLink?: string | undefined
  occasions?: string[] | undefined
  flowerTypes?: string[] | undefined
  colorTheme?: string | null | undefined
  attributes?: Record<string, unknown> | null | undefined
}

const PICKER_LIMIT = 100
const SEARCH_DEBOUNCE_MS = 280

/**
 * Sản phẩm trong một bộ sưu tập + kho sản phẩm để thêm vào (SWR).
 *
 * Chiến lược lọc:
 * - Server-side: `search` (ILIKE name/code) khi người dùng gõ vào ô tìm kiếm
 * - Client-side: mọi filter còn lại qua `filterProducts()` từ SSOT `@/lib/product-filter`
 *   → đảm bảo hoạt động đúng dù dữ liệu sản phẩm chưa đầy đủ (thiếu attributes)
 */
export function useCatalogItems<TDetail extends { items: Array<{ product: { id: string } }> }>(
  catalogId: string,
  onItemCountChange?: (count: number) => void
) {
  const detail = useApi<{ data: TDetail }>(`/api/v1/greeting-card/catalogs/${catalogId}`, {
    onSuccess: (res) => onItemCountChange?.(res.data.items.length),
  })
  const [pickerOpen, setPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const priceBudgets = usePriceBudgets()
  const [selectedBudgets, setSelectedBudgets] = useState<string[]>([])
  const [filterOccasion, setFilterOccasion] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("")
  const [filterFlowerType, setFilterFlowerType] = useState<string>("")
  const [filterColorTone, setFilterColorTone] = useState<string>("")
  // Bộ sưu tập user không muốn trùng mẫu — không ghi nhớ, mỗi lần mở bắt đầu trống
  const [excludedCatalogIds, setExcludedCatalogIds] = useState<string[]>([])
  const excluded = useExcludedCatalogProducts(excludedCatalogIds)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // Server-side lọc text search và category (dáng hoa) để quét toàn bộ CSDL
  const productsUrl = (() => {
    if (!pickerOpen) return null
    const params = new URLSearchParams()
    params.set("limit", String(PICKER_LIMIT))
    params.set("status", "ACTIVE")
    if (debouncedSearch) params.set("search", debouncedSearch)
    if (filterCategory) params.set("category", filterCategory)
    return `/api/v1/products?${params.toString()}`
  })()

  const products = useApi<{ data: AvailableProduct[] }>(productsUrl)

  async function change(method: "POST" | "DELETE", productId: string) {
    setBusyId(productId)
    setError(null)
    try {
      await apiSend(
        `/api/v1/greeting-card/catalogs/${catalogId}/products`,
        method,
        { product_id: productId },
        method === "POST" ? "Không thêm được sản phẩm" : "Không xoá được sản phẩm"
      )
      await detail.mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusyId(null)
    }
  }

  const catalog = detail.data?.data ?? null
  const existing = new Set(catalog?.items.map((i) => i.product.id) ?? [])

  const resetFilters = () => {
    setSelectedBudgets([])
    setFilterOccasion("")
    setFilterCategory("")
    setFilterFlowerType("")
    setFilterColorTone("")
    setExcludedCatalogIds([])
  }

  const hasActiveFilters =
    selectedBudgets.length > 0 ||
    Boolean(filterOccasion) ||
    Boolean(filterCategory) ||
    Boolean(filterFlowerType) ||
    Boolean(filterColorTone) ||
    excludedCatalogIds.length > 0

  const notInCatalog = (products.data?.data ?? []).filter((p) => !existing.has(p.id))
  const rawAvailable = withoutProducts(notInCatalog, excluded.excludedProductIds)

  // Ánh xạ selectedBudgets → PriceRange[] cho SSOT engine (khoảng giá do cửa hàng cấu hình)
  const priceRanges = priceBudgets
    .filter((b) => selectedBudgets.includes(b.id))
    .map((b) => {
      const { min, max } = toInclusiveRange(b)
      return { min, max }
    })

  // Tạo criteria theo chuẩn SSOT — dùng conditional spread để chập exactOptionalPropertyTypes
  const criteria: ProductFilterCriteria = {
    ...(priceRanges.length > 0 ? { priceRanges } : {}),
    ...(filterOccasion ? { occasion: filterOccasion } : {}),
    ...(filterCategory ? { category: filterCategory } : {}),
    ...(filterFlowerType ? { flowerType: filterFlowerType } : {}),
    ...(filterColorTone ? { colorTone: filterColorTone } : {}),
  }

  // Lọc qua SSOT engine — cast để tương thích FilterableProduct
  const filteredAvailable = filterProducts(
    rawAvailable as import("@/lib/product-filter").FilterableProduct[],
    criteria
  ) as AvailableProduct[]

  return {
    catalog,
    loading: detail.isLoading,
    reload: () => detail.mutate(),
    pickerOpen,
    openPicker: () => setPickerOpen(true),
    closePicker: () => {
      setPickerOpen(false)
      setSearchQuery("")
      setDebouncedSearch("")
      resetFilters()
    },
    loadingProducts: products.isLoading,
    searchQuery,
    setSearchQuery,
    priceBudgets,
    selectedBudgets,
    setSelectedBudgets,
    filterOccasion,
    setFilterOccasion,
    filterCategory,
    setFilterCategory,
    filterFlowerType,
    setFilterFlowerType,
    filterColorTone,
    setFilterColorTone,
    resetFilters,
    hasActiveFilters,
    excludedCatalogIds,
    setExcludedCatalogIds,
    excludeLoading: excluded.loading,
    /** Số mẫu bị ẩn vì đã có trong bộ sưu tập user chọn tránh trùng */
    excludedHiddenCount: notInCatalog.length - rawAvailable.length,
    /** Tổng số sản phẩm trong kho (chưa lọc theo BST hay bộ lọc) */
    totalWarehouseCount: (products.data?.data ?? []).length,
    /** Sản phẩm sau khi lọc qua SSOT product-filter engine */
    available: filteredAvailable,
    rawCount: rawAvailable.length,
    add: (productId: string) => change("POST", productId),
    remove: (productId: string) => change("DELETE", productId),
    busyId,
    error: error ?? excluded.error,
  }
}
