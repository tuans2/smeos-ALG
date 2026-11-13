"use client"

import useSWR from "swr"
import { apiGet } from "@/components/greeting-card/greeting-api"

type CatalogDetail = { data: { items: Array<{ product: { id: string } }> } }

/** Sản phẩm nằm trong bất kỳ bộ sưu tập nào đã chọn — bộ lọc "không trùng mẫu". Thuần, để test. */
export function productIdsOfCatalogs(details: CatalogDetail[]): Set<string> {
  return new Set(details.flatMap((d) => d.data.items.map((i) => i.product.id)))
}

/** Bỏ khỏi danh sách chọn những mẫu đã có trong các bộ sưu tập user muốn tránh trùng. */
export function withoutProducts<T extends { id: string }>(products: T[], excluded: Set<string>): T[] {
  return excluded.size === 0 ? products : products.filter((p) => !excluded.has(p.id))
}

/** Tải sản phẩm của các bộ sưu tập đã chọn (một request mỗi bộ, SWR khử trùng lặp). */
export function useExcludedCatalogProducts(catalogIds: string[]) {
  const key = catalogIds.length > 0 ? ["excluded-catalog-products", ...[...catalogIds].sort()] : null
  const res = useSWR(key, ([, ...ids]: string[]) =>
    Promise.all(ids.map((id) => apiGet<CatalogDetail>(`/api/v1/greeting-card/catalogs/${id}`)))
  )
  return {
    excludedProductIds: res.data ? productIdsOfCatalogs(res.data) : new Set<string>(),
    loading: res.isLoading,
    error: res.error ? "Không tải được sản phẩm của bộ sưu tập đã chọn" : null,
  }
}
