"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { InlineError } from "@/components/ui/inline-error"
import { useTenantProfile } from "@/lib/hooks/use-tenant-profile"
import { LandingTypeSelector } from "./landing-type-selector"
import { LandingCampaignTab } from "@/components/catalog/landing-campaign-tab"
import { driveThumbProxySrc } from "@/modules/greeting-card/domain/drive-thumb"
import type { CatalogProduct } from "@/components/catalog/catalog-management-tab"
import type { LandingPageType } from "@/modules/landing-page/domain/preset-catalog"
import { Disclosure } from "@/components/ui/disclosure"
import { ShopReviewsManager } from "@/components/catalog/reviews/shop-reviews-manager"
import { PageHeader } from "@/components/ui/page-header"
import { OfficialLandingBanner } from "./official-landing-banner"

export function LandingPageStudioClient() {
  const router = useRouter()
  const [pageType, setPageType] = useState<LandingPageType>("STORE_BRAND")
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { business, loading: profileLoading } = useTenantProfile()

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/products?limit=100")
      if (res.status === 401) {
        router.push("/dang-nhap")
        return
      }
      if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm")
      const json = await res.json()
      const rawProducts = (json.data || []) as Array<{
        id: string
        code: string
        name: string
        category?: string | null
        status: string
        occasion_code?: string | null
        color?: string | null
        collection?: string | null
        price_vnd?: number | null
        masterImageUrl?: string | null
        driveLink?: string | null
        attributes?: Record<string, unknown> | null
      }>
      // Map API fields → CatalogProduct shape (masterImageUrl → imageUrl, price_vnd → price)
      setProducts(
        rawProducts.map((p) => {
          const resolvedDriveLink =
            p.driveLink ??
            (typeof p.attributes?.drive_link === "string" ? p.attributes.drive_link : null)
          const resolvedMasterImg =
            p.masterImageUrl ??
            (typeof p.attributes?.imageUrl === "string" ? p.attributes.imageUrl : null)
          const finalImageUrl =
            resolvedMasterImg || (resolvedDriveLink ? driveThumbProxySrc(resolvedDriveLink) : null)

          return {
            id: p.id,
            code: p.code,
            name: p.name,
            category: p.category ?? null,
            status: p.status as "DRAFT" | "ACTIVE" | "ARCHIVED",
            occasion_code: p.occasion_code ?? null,
            color: p.color ?? null,
            collection: p.collection ?? null,
            price: p.price_vnd ?? null,
            imageUrl: finalImageUrl,
            driveLink: resolvedDriveLink,
            attributes: p.attributes ?? null,
          }
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi khi tải dữ liệu")
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    void Promise.resolve().then(() => fetchProducts())
  }, [fetchProducts])

  if (loading || profileLoading) {
    return (
      <div className="flex h-full flex-col p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="h-8 w-48 bg-surface-alt rounded animate-pulse motion-reduce:animate-none" />
        </div>
        <SkeletonBlock lines={5} label="Đang mở công cụ tạo landing page" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Header */}
      <PageHeader
        className="flex-shrink-0 border-b border-border bg-surface px-4 sm:px-6 py-3.5"
        title="Tạo landing page cửa hàng"
        backHref="/cong-cu"
        backLabel="Về thư viện công cụ"
        actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/the-chao" as never)}
          aria-label="Thẻ chào và mã QR"
          className="flex items-center gap-1.5 text-caption font-semibold"
        >
          <QrCode className="h-3.5 w-3.5" aria-hidden="true" /> <span className="hidden sm:inline">Thẻ chào & QR</span>
        </Button>
        }
      />

      {/* Main Workspace */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6 space-y-5">
        {error && (
          <InlineError
            message={`${error}. Bạn vẫn tạo được trang; danh sách sản phẩm sẽ trống.`}
            onRetry={() => {
              setError(null)
              void fetchProducts()
            }}
          />
        )}

        <FeatureGuidanceCard
          guidanceId="landing-page"
          title="Trang giới thiệu có link chia sẻ và mã QR"
          description="Khách mở trên điện thoại để gọi, nhắn Zalo hoặc đặt hàng. Thông tin tiệm lấy sẵn từ hồ sơ cửa hàng."
        />

        {/* Trang chính thức tạo ở mục Thương hiệu (bước 3) — hai nơi nối với nhau */}
        <OfficialLandingBanner />

        {/* Mục đích trang — gửi cho AI soạn nội dung (03c UX-027) */}
        <LandingTypeSelector selectedType={pageType} onSelectType={setPageType} />

        <LandingCampaignTab products={products} onRefresh={fetchProducts} pageType={pageType} shopName={business?.display_name} />

        <Disclosure label="Đánh giá khách hiện trên trang (Khách hàng nói gì)">
          <ShopReviewsManager />
        </Disclosure>
      </div>
    </div>
  )
}
