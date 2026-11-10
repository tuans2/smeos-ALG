"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft } from "@/components/ui/icons"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { CatalogGuidanceCard } from "@/components/templates/catalog/catalog-guidance-card"
import { CatalogManagementTab, type CatalogProduct, type CatalogLinkItem } from "@/components/catalog/catalog-management-tab"
import { useCatalogProducts } from "@/components/catalog/use-catalog-products"
import { BudgetMatchingModal } from "@/components/sales/budget-matching-modal"
import type { ProductMatchCandidate } from "@/modules/products/domain/budget-flower-matcher"
import { useI18n } from "@/lib/i18n"
import { PageHeader } from "@/components/ui/page-header"
import { PUBLIC_COLLECTION } from "@/modules/toolkit/domain/collection-names"

/**
 * Trang Chức năng 09: Bộ sưu tập chung (một link cho nhiều khách).
 *
 * Chuyên sâu quản lý catalog trực tuyến và showroom sản phẩm số hóa.
 */
export default function CatalogWebsitePage() {
  const router = useRouter()
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false)
  const { products, loading: productsLoading, error: productsError, reload: fetchProducts } = useCatalogProducts("catalog")
  const [catalogLinks, setCatalogLinks] = useState<CatalogLinkItem[]>([])
  const [linksLoading, setLinksLoading] = useState(true)
  const [linksError, setLinksError] = useState<string | null>(null)
  const loading = productsLoading || linksLoading
  const error = productsError ?? linksError

  const fetchCatalogLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/catalog-links?include_revoked=true")
      if (res.status === 401) { router.push("/dang-nhap"); return }
      if (!res.ok) throw new Error("Không thể tải danh sách catalog")
      const data = await res.json()
      setCatalogLinks(data.data || [])
    } catch (e) {
      setLinksError(e instanceof Error ? e.message : "Lỗi không xác định")
    }
  }, [router])

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchCatalogLinks()])
  }, [fetchProducts, fetchCatalogLinks])

  useEffect(() => {
    const loadLinks = async () => {
      setLinksLoading(true)
      await fetchCatalogLinks()
      setLinksLoading(false)
    }
    loadLinks()
  }, [fetchCatalogLinks])

  const activeCount = products.filter((p) => p.status === "ACTIVE").length

  if (loading) {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <CatalogHeader onBack={() => router.push("/")} />
        <div className="p-[18px]">
          <SkeletonBlock lines={4} label="Đang tải danh mục sản phẩm" />
        </div>
      </div>
    )
  }

  // Sản phẩm chưa có giá không đưa vào gợi ý ngân sách — không báo giá bịa (OPERATING_PRINCIPLES §2)
  const matchCandidates: ProductMatchCandidate[] = products
    .filter((p): p is CatalogProduct & { price: number } => typeof p.price === "number")
    .map((p) => ({
    id: p.id,
    code: p.code || p.id,
    name: p.name,
    sellingPriceVnd: p.price,
    category: p.category || "Sản phẩm",
    // Chỉ dùng dữ liệu thật của sản phẩm; thiếu thì để rỗng, không bịa (OPERATING_PRINCIPLES §2)
    colorTheme: p.color ?? "",
    occasions: p.occasion_code ? [p.occasion_code] : [],
    style: typeof p.attributes?.style === "string" ? p.attributes.style : "",
    imageUrl: p.imageUrl || undefined,
    highlightFlowers: [],
  }))

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <CatalogHeader
        onBack={() => router.push("/cong-cu" as never)}
        onOpenBudgetMatcher={() => setIsBudgetModalOpen(true)}
      />

      <div className="flex flex-1 flex-col overflow-y-auto p-[18px] gap-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive-bg px-4 py-2.5 text-body-sm text-destructive">
            <AlertTriangle size={16} weight="fill" className="shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Khối hướng dẫn chuẩn SSOT */}
        <CatalogGuidanceCard />

        {/* Nội dung quản lý Catalog & Bộ sưu tập */}
        <CatalogManagementTab
          products={products}
          catalogLinks={catalogLinks}
          onRefresh={refreshAll}
        />
      </div>

      <BudgetMatchingModal
        open={isBudgetModalOpen}
        onOpenChange={setIsBudgetModalOpen}
        customCandidates={matchCandidates}
      />
    </div>
  )
}

/* ── Đầu trang Catalog (PageHeader chuẩn) ──────────────────────────────────────────── */

function CatalogHeader({
  onBack,
  onOpenQuickCollection,
  onOpenBudgetMatcher,
}: {
  onBack: () => void
  onOpenQuickCollection?: (() => void) | undefined
  onOpenBudgetMatcher?: (() => void) | undefined
}) {
  const { ti } = useI18n()
  const sampleProd = ti("sampleProduct")
  const budgetBtnLabel = sampleProd ? `Tìm ${sampleProd.toLowerCase()} theo ngân sách` : "Tìm theo ngân sách"

  return (
    <PageHeader
      className="flex-shrink-0 border-b border-border bg-surface px-[18px] py-4"
      title={PUBLIC_COLLECTION.name}
      tip={PUBLIC_COLLECTION.hint}
      actions={
        <>
          {onOpenBudgetMatcher && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBudgetMatcher}
              className="flex items-center gap-1.5 text-caption"
            >
              {budgetBtnLabel}
            </Button>
          )}
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-1.5">
            <ArrowLeft size={16} strokeWidth={2} /> Quay về Công cụ
          </Button>
        </>
      }
    />
  )
}