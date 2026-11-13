"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import type { CatalogProduct } from "@/components/catalog/catalog-management-tab"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"

/**
 * Tải sản phẩm cho các luồng tạo landing / bộ sưu tập chung — một chỗ cho /landing-page, /catalog và nhóm
 * "Quảng bá sản phẩm" trên /cong-cu (PO 09/11/2026). Hai kiểu giữ nguyên hành vi cũ của từng trang:
 * - `landing`: chỉ `GET /products`;
 * - `catalog`: ghép thêm ảnh + giá từ phân tích ảnh đã duyệt (`GET /vision/analyses?approval_state=APPROVED`).
 */
export type CatalogProductsMode = "landing" | "catalog"

class Unauthorized extends Error {}

type RawProduct = CatalogProduct & {
  masterImageUrl?: string | null
  price_vnd?: number | null
  attributes?: Record<string, unknown> | null
}

function driveLinkOf(p: RawProduct): string | null {
  return p.driveLink ?? (typeof p.attributes?.drive_link === "string" ? p.attributes.drive_link : null)
}

function imageOf(master: string | null | undefined, driveLink: string | null): string | null {
  return master || (driveLink ? driveThumbProxySrc(driveLink) : null)
}

async function fetchRawProducts(failMessage: string): Promise<RawProduct[]> {
  const res = await fetch("/api/v1/products?limit=100")
  if (res.status === 401) throw new Unauthorized()
  if (!res.ok) throw new Error(failMessage)
  return ((await res.json()).data || []) as RawProduct[]
}

async function loadLandingProducts(): Promise<CatalogProduct[]> {
  const raw = await fetchRawProducts("Không thể tải danh sách sản phẩm")
  return raw.map((p) => {
    const driveLink = driveLinkOf(p)
    const master = p.masterImageUrl ?? (typeof p.attributes?.imageUrl === "string" ? p.attributes.imageUrl : null)
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category ?? null,
      status: p.status,
      occasion_code: p.occasion_code ?? null,
      color: p.color ?? null,
      collection: p.collection ?? null,
      price: p.price_vnd ?? null,
      imageUrl: imageOf(master, driveLink),
      driveLink,
      attributes: p.attributes ?? null,
    }
  })
}

async function loadCatalogProducts(): Promise<CatalogProduct[]> {
  const [raw, analysisRes] = await Promise.all([
    fetchRawProducts("Không thể tải sản phẩm"),
    fetch("/api/v1/vision/analyses?approval_state=APPROVED").catch(() => null),
  ])
  // Ghép ảnh và giá từ phân tích ảnh đã duyệt
  const extra = new Map<string, { imageUrl: string | null; price: number | null }>()
  if (analysisRes && analysisRes.ok) {
    const json = await analysisRes.json().catch(() => ({}))
    for (const a of Array.isArray(json.data) ? json.data : []) {
      if (!a.product_id) continue
      const raw = (a.raw as Record<string, unknown>) || {}
      const edited = (a.edited as Record<string, unknown>) || {}
      const salesData = (edited.salesData || raw.salesData || {}) as Record<string, unknown>
      extra.set(a.product_id, { imageUrl: a.image_url || null, price: typeof salesData.price === "number" ? salesData.price : null })
    }
  }
  return raw.map((p) => {
    const e = extra.get(p.id)
    const driveLink = driveLinkOf(p)
    const master = e?.imageUrl || p.masterImageUrl || (typeof p.attributes?.imageUrl === "string" ? p.attributes.imageUrl : null)
    return { ...p, imageUrl: imageOf(master, driveLink), driveLink, price: p.price ?? p.price_vnd ?? e?.price ?? null }
  })
}

export function useCatalogProducts(mode: CatalogProductsMode) {
  const router = useRouter()
  const swr = useSWR<CatalogProduct[]>(["catalog-products", mode], () => (mode === "catalog" ? loadCatalogProducts() : loadLandingProducts()), {
    revalidateOnFocus: false,
    onError: (e) => { if (e instanceof Unauthorized) router.push("/dang-nhap") },
  })
  const { mutate } = swr
  const reload = useCallback(async () => { await mutate() }, [mutate])
  const error = swr.error && !(swr.error instanceof Unauthorized)
    ? (swr.error instanceof Error && swr.error.message ? swr.error.message : "Lỗi khi tải dữ liệu")
    : null

  return { products: swr.data ?? [], loading: swr.isLoading, error, reload }
}
