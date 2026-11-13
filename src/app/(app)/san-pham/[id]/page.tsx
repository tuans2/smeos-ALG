"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { productLoadError } from "@/lib/load-error-message"
import { DetailLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { driveThumbProxySrc } from "@/components/greeting-card/drive-thumb-image"
import { AiProductEnrichmentModal } from "@/components/products/ai-product-enrichment-modal"
import { ProductReminderOverrideCard } from "@/components/coordinator/product-reminder-override-card"
import { NormalizeImageButton } from "@/components/products/normalize-image-button"
import { ProductProposalBanner } from "@/components/products/product-proposal-banner"
import { ProductChangeRequestsCard } from "@/components/products/product-change-requests-card"
import { ProductRevisionsCard } from "@/components/products/product-revisions-card"
import { useSession } from "@/lib/session"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { useI18n } from "@/lib/i18n"
import {
  ProductOverviewCard,
  ProductDesignCard,
  ProductBomCard,
  ProductStoryCard,
} from "@/components/products/product-detail-cards"
import { ProductAvailabilityCard } from "@/components/products/product-availability-card"
import { ProductCraftFeeCard } from "@/components/products/product-craft-fee-card"

type ProductDetail = {
  id: string
  name: string
  code: string
  category: string | null
  shape: string | null
  facing: string | null
  container: string | null
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED"
  attributes: Record<string, unknown> | null
  availability_config?: unknown
  masterImageUrl?: string
  price_vnd?: number | null
  driveLink?: string
  created_at?: string
  updated_at?: string
}

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const productId = params.id
  const { can } = useSession()
  const canEdit = can("F2") || can("H4")

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [vuaTaoMoi, setVuaTaoMoi] = useState(false)
  const [normalizedDisplayUrl, setNormalizedDisplayUrl] = useState<string | null>(null)
  const { industry: industryFromSession } = useI18n()
  const activeIndustry = industryFromSession || getIndustryPlugin()

  const napLai = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/products/${productId}`)
      if (res.status === 401) {
        router.push("/dang-nhap" as never)
        return
      }
      if (!res.ok) throw new Error(productLoadError(res.status))
      const data = (await res.json()) as { product?: ProductDetail } | ProductDetail
      const p = "product" in data && data.product ? data.product : (data as ProductDetail)
      setProduct(p)
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không tải được sản phẩm")
    }
  }, [productId, router])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("moi") !== "1") return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- đọc cờ URL
    setVuaTaoMoi(true)
    setIsModalOpen(true)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nạp chi tiết khi mount
    napLai()
  }, [napLai])

  const attrs = (product?.attributes as Record<string, unknown> | null) ?? {}
  const rawBom = (attrs.bom as Record<string, unknown> | undefined) ?? {}
  const rawFlowers = (Array.isArray(rawBom.materials)
    ? rawBom.materials
    : Array.isArray(rawBom.flowers)
    ? rawBom.flowers
    : []) as Parameters<typeof ProductBomCard>[0]["flowers"]
  const primaryColor = (attrs.color as string) || null
  const description = (attrs.description as string) || null
  const priceVnd =
    typeof attrs.price === "number" && attrs.price > 0
      ? attrs.price
      : typeof product?.price_vnd === "number" && product.price_vnd > 0
      ? product.price_vnd
      : null

  const driveLink = product?.driveLink || (typeof attrs.drive_link === "string" ? attrs.drive_link : null)
  const rawDisplayImageUrl =
    product?.masterImageUrl ||
    (typeof attrs.imageUrl === "string" ? attrs.imageUrl : null) ||
    (driveLink ? driveThumbProxySrc(driveLink) : null)
  const displayImageUrl = normalizedDisplayUrl ?? rawDisplayImageUrl

  return (
    <DetailLayout
      header={
        <PageHeader
          backHref="/san-pham"
          backLabel="Danh sách sản phẩm"
          title={product ? product.name : "Chi tiết sản phẩm"}
          breadcrumbs="Chi tiết sản phẩm"
          actions={
            product ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/san-pham/${productId}/tinh-nang` as never)}
                  aria-label="Mở Studio Tính Năng"
                  className="flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-primary" />
                  <span className="hidden sm:inline">Mở Studio Tính Năng</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 font-bold"
                >
                  <Sparkles size={14} />
                  <span>Phân tích AI & Chỉnh sửa</span>
                </Button>
              </div>
            ) : undefined
          }
        />
      }
    >
      <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
        {loi && (
          <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
            {loi}
          </div>
        )}
        {vuaTaoMoi && (
          <div className="rounded-xl border border-success-border bg-success-bg px-3.5 py-2.5 text-body-sm font-medium text-success">
            Đã tạo mẫu mới. Kiểm tra lại thông tin và trạng thái bán của mẫu.
          </div>
        )}

        {product === null ? (
          loi ? null : <div className="py-4"><SkeletonBlock lines={6} /></div>
        ) : (
          <div className="flex flex-col gap-4">
            <ProductProposalBanner productId={product.id} attributes={attrs} onChanged={napLai} />
            {can("H3") && <ProductChangeRequestsCard productId={product.id} current={{ ...product, attributes: attrs }} onChanged={napLai} />}
            
            <ProductOverviewCard
              name={product.name}
              code={product.code}
              status={product.status}
              priceVnd={priceVnd}
              primaryColor={primaryColor}
              displayImageUrl={displayImageUrl}
            />

            {rawDisplayImageUrl && canEdit && (
              <Card className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-body-sm font-bold text-text">Chuẩn hóa ảnh marketing</div>
                    <div className="text-caption text-text-muted mt-0.5">
                      Biến ảnh sản phẩm hiện tại thành ảnh studio chuyên nghiệp, giữ nguyên hình dáng sản phẩm.
                    </div>
                  </div>
                  <NormalizeImageButton
                    imageUrl={rawDisplayImageUrl}
                    industry={activeIndustry}
                    onAccept={(newUrl: string) => setNormalizedDisplayUrl(newUrl)}
                  />
                </div>
              </Card>
            )}

            <ProductDesignCard
              shape={product.shape}
              facing={product.facing}
              container={product.container}
            />

            <ProductBomCard
              flowers={rawFlowers}
              onOpenModal={() => setIsModalOpen(true)}
            />

            <ProductStoryCard
              description={description}
              onOpenModal={() => setIsModalOpen(true)}
            />

            <ProductReminderOverrideCard
              productId={productId}
              canEdit={can("R12")}
            />

            {activeIndustry?.craftFee && can("L3") && can("L5") && (
              <ProductCraftFeeCard
                productId={productId}
                attributes={attrs}
                spec={activeIndustry.craftFee}
                onUpdated={napLai}
              />
            )}

            <ProductAvailabilityCard
              productId={productId}
              initialConfig={product.availability_config}
              industryKey={activeIndustry?.identity.key}
              canEdit={canEdit}
              onUpdated={napLai}
            />

            {can("H3") && <ProductRevisionsCard productId={productId} onChanged={napLai} />}
          </div>
        )}
      </div>

      {product && (
        <AiProductEnrichmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          productId={productId}
          initialProduct={product}
          onSuccess={napLai}
          onSavedAsNew={(created) => router.push(`/san-pham/${created.id}?moi=1` as never)}
        />
      )}
    </DetailLayout>
  )
}
