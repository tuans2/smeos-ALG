"use client"

import React, { useState, useMemo } from "react"
import { AlertCircle } from "@/components/ui/icons"
import type { PublicCatalogResult, PublicCatalogProduct } from "@/modules/catalog-links/use-cases/get-public-catalog"
import type { GeneratedLandingPackage } from "@/modules/content-engine/domain/landing-content-generator"
import { ProductDetailModal } from "./product-detail-modal"
import { ShareCatalogModal } from "./share-catalog-modal"
import { CatalogStorefrontHeader } from "./catalog-storefront-header"
import {
  LandingTemplateStory,
  LandingTemplatePerks,
  LandingTemplateProcess,
  LandingTemplateReviews,
  LandingTemplateFaq,
  LandingTemplateLead,
  LandingTemplateVideo,
  LandingTemplateGallery,
  LandingTemplateStoreInfo,
} from "./landing-templates"
import type { GalleryPhotoItem } from "./landing-templates/landing-template-gallery"
import { CatalogProductListView } from "./catalog-product-list-view"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"
import { CATALOG_TEMPLATES } from "@/modules/catalog-studio/domain/templates/template-registry"
import { CatalogStorefrontHero } from "./catalog-storefront-hero"
import { CatalogStorefrontToolbar } from "./catalog-storefront-toolbar"
import { PublicHero } from "./public/public-hero"
import { publicThemeVars } from "./public/public-theme-vars"
import { PublicStickyActions } from "./public/public-sticky-actions"
import { entryOf } from "./public/public-entry"

const PRODUCTS_ANCHOR_ID = "bo-suu-tap"
const EMPTY_PRODUCTS: PublicCatalogProduct[] = []

export interface CatalogStorefrontProps {
  initialData: PublicCatalogResult
}

export function CatalogStorefront({ initialData }: CatalogStorefrontProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedOccasion, setSelectedOccasion] = useState<string>("all")
  const [selectedProduct, setSelectedProduct] = useState<PublicCatalogProduct | null>(null)
  // true: khách bấm "Đặt hàng" trên thẻ → mở thẳng form đặt hàng trong chi tiết mẫu
  const [startOrdering, setStartOrdering] = useState(false)
  const entry = entryOf(initialData)
  const [showShareModal, setShowShareModal] = useState(false)

  const templateId = (initialData.status === "ACTIVE" && initialData.templateId) || "T01_SIGNATURE_COLLECTION"
  const styleId = (initialData.status === "ACTIVE" && initialData.styleId) || "S01_EDITORIAL_MAGAZINE"
  const currentStyle = CATALOG_STYLES[styleId] || CATALOG_STYLES.S01_EDITORIAL_MAGAZINE
  const currentTemplate = CATALOG_TEMPLATES[templateId] || CATALOG_TEMPLATES.T01_SIGNATURE_COLLECTION

  const defaultLayout: "grid" | "lookbook" | "compact" = useMemo(() => {
    if (templateId === "T02_MINIMAL_PRODUCT_LIST") return "compact"
    if (["T01_SIGNATURE_COLLECTION", "T03_PREMIUM_LOOKBOOK", "T05_DARK_CINEMATIC"].includes(templateId)) return "lookbook"
    return "grid"
  }, [templateId])

  const [catalogStyle, setCatalogStyle] = useState<"grid" | "lookbook" | "compact">(defaultLayout)

  const products = initialData.status === "ACTIVE" ? initialData.products : EMPTY_PRODUCTS
  const allOccasions = useMemo(() => {
    const occs = new Set<string>()
    for (const p of products) for (const occ of p.occasions) if (occ) occs.add(occ)
    return Array.from(occs)
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSearch && (selectedOccasion === "all" || p.occasions.includes(selectedOccasion))
    })
  }, [products, searchQuery, selectedOccasion])

  if (initialData.status === "REVOKED") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-3xl p-8 border border-border shadow-xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-warning-bg text-warning-text flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-title font-black text-text mb-2">Bộ sưu tập đã đóng</h1>
          <p className="text-body-sm text-text-muted leading-relaxed mb-6">
            Bộ sưu tập <span className="font-semibold text-text">&quot;{initialData.catalogName}&quot;</span> đã tạm ngừng chia sẻ.
          </p>
          <div className="p-4 rounded-2xl bg-surface-alt border border-border text-caption text-text-muted w-full">
            Vui lòng liên hệ trực tiếp với cửa hàng để được tư vấn danh mục mới nhất.
          </div>
        </div>
      </div>
    )
  }

  if (initialData.status === "NOT_FOUND") {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface rounded-3xl p-8 border border-border shadow-xl text-center">
          <h1 className="text-title font-black text-text mb-2">Không tìm thấy danh mục</h1>
          <p className="text-body-sm text-text-muted">Đường dẫn catalog này không tồn tại hoặc đã bị gỡ bỏ.</p>
        </div>
      </div>
    )
  }

  const { catalog, shop } = initialData
  const campaign = initialData.campaignConfig
  const customHeroImageUrl = campaign?.customHeroImageUrl as string | undefined
  // Landing page chính thức: ảnh, video, thông tin cửa hàng đọc sống từ Hồ sơ (mục Thương hiệu)
  const storeInfo = initialData.storeInfo
  const videoUrl = storeInfo?.introVideo ?? (campaign?.videoUrl as string | undefined)
  const generatedPackage = campaign?.generatedPackage as GeneratedLandingPackage | undefined
  const enabledSections = campaign?.enabledSections as Record<string, boolean> | undefined

  const realProductImageUrls = products
    .map((p) => p.imageUrl)
    .filter((url): url is string =>
      typeof url === "string" && url.trim().length > 0 && !url.startsWith("blob:") && !url.startsWith("data:")
    )

  const storePhotos: GalleryPhotoItem[] = (storeInfo?.photos ?? []).map((src) => ({ src, title: shop.name, caption: "Không gian cửa hàng" }))
  const galleryPhotos: GalleryPhotoItem[] = storePhotos.length > 0 ? storePhotos : products
    .filter((p): p is typeof p & { imageUrl: string } =>
      typeof p.imageUrl === "string" && p.imageUrl.trim().length > 0 &&
      !p.imageUrl.startsWith("blob:") && !p.imageUrl.startsWith("data:")
    )
    .map((p) => ({ src: p.imageUrl, title: p.name, caption: p.category ?? "Sản phẩm tuyển chọn" }))

  const storyImageUrl = realProductImageUrls[0] ?? null
  // Hero chỉ dùng ảnh thật (ảnh tiệm tải lên hoặc ảnh sản phẩm) — không ảnh minh hoạ thay thế
  const heroImageUrl = storeInfo?.photos[0] || customHeroImageUrl || realProductImageUrls[0] || null
  const heroHeadline = generatedPackage?.hero?.headline || catalog.name
  const heroSubHeadline = generatedPackage?.hero?.subHeadline || catalog.description

  return (
    <div
      className="min-h-screen antialiased transition-colors pb-28 md:pb-16"
      style={{ ...publicThemeVars(currentStyle), backgroundColor: currentStyle.tokens.background, color: currentStyle.tokens.textPrimary }}
    >
      <CatalogStorefrontHeader
        shop={shop}
        catalog={catalog}
        products={products}
        onOpenShareModal={() => setShowShareModal(true)}
        style={currentStyle}
        templateId={templateId}
        styleId={styleId}
        contactEnabled={entry.contact}
      />

      {heroImageUrl && (
        <PublicHero
          headline={heroHeadline}
          subHeadline={heroSubHeadline}
          imageUrl={heroImageUrl}
          shopName={shop.name}
          productCount={products.length}
          customerName={initialData.customer?.name ?? null}
          style={currentStyle}
          productsAnchorId={PRODUCTS_ANCHOR_ID}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {!heroImageUrl && (
          <CatalogStorefrontHero
            catalogName={heroHeadline}
            catalogDescription={heroSubHeadline}
            style={currentStyle}
            template={currentTemplate}
            customerName={initialData.customer?.name ?? null}
            brandName={shop.name}
            productCount={products.length}
          />
        )}

        {campaign && videoUrl && (
          <LandingTemplateVideo videoUrl={videoUrl} archetypeId={campaign.archetype} title="Video mẫu thật" />
        )}

        {campaign && enabledSections?.story !== false && generatedPackage?.story && storyImageUrl && (
          <LandingTemplateStory story={generatedPackage.story} archetypeId={campaign.archetype} storyImageUrl={storyImageUrl} />
        )}

        {/* Filter & Layout Toolbar */}
        <div id={PRODUCTS_ANCHOR_ID} className="scroll-mt-20" />
        <CatalogStorefrontToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          catalogStyle={catalogStyle}
          onStyleChange={setCatalogStyle}
          selectedOccasion={selectedOccasion}
          onOccasionChange={setSelectedOccasion}
          allOccasions={allOccasions}
          totalCount={products.length}
          hasCampaign={!!campaign}
          style={currentStyle}
        />

        {/* Products Grid */}
        <CatalogProductListView
          products={filteredProducts}
          catalogStyle={catalogStyle}
          shop={shop}
          style={currentStyle}
          onSelectProduct={(p) => { setStartOrdering(false); setSelectedProduct(p) }}
          entry={entry}
          onOrderProduct={(p) => { setStartOrdering(true); setSelectedProduct(p) }}
          onResetFilter={() => { setSearchQuery(""); setSelectedOccasion("all") }}
        />

        {campaign && enabledSections?.perks !== false && generatedPackage?.perks && (
          <LandingTemplatePerks perks={generatedPackage.perks} archetypeId={campaign.archetype} />
        )}
        {campaign && enabledSections?.process !== false && generatedPackage?.steps && (
          <LandingTemplateProcess steps={generatedPackage.steps} archetypeId={campaign.archetype} />
        )}
        {campaign && enabledSections?.gallery !== false && galleryPhotos.length > 0 && (
          <LandingTemplateGallery archetypeId={campaign.archetype} photos={galleryPhotos} />
        )}
        {/* Đánh giá do chủ tiệm nhập và đang bật — cả landing lẫn catalog; rỗng thì khối tự ẩn */}
        {enabledSections?.reviews !== false && (
          <LandingTemplateReviews archetypeId={campaign?.archetype} reviews={initialData.reviews ?? []} />
        )}
        {campaign && enabledSections?.faq !== false && generatedPackage?.faq && (
          <LandingTemplateFaq faq={generatedPackage.faq} archetypeId={campaign.archetype} />
        )}
        {storeInfo && <LandingTemplateStoreInfo info={storeInfo} shopName={shop.name} />}
        {/* Nút "Liên hệ / Cần tư vấn" — Điều hành bật tắt theo nguồn (Đơn hàng › Cài đặt) */}
        {campaign && enabledSections?.lead !== false && entry.contact && (
          <LandingTemplateLead
            archetypeId={campaign.archetype || "minimal-luxury"}
            occasionTitle={catalog.name}
            catalogSlug={catalog.slug}
            lead={generatedPackage?.lead}
          />
        )}
      </div>

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          shop={shop}
          customer={initialData.customer}
          orderSlug={entry.order ? catalog.slug : undefined}
          startOrdering={startOrdering}
          contactEnabled={entry.contact}
          onClose={() => setSelectedProduct(null)}
        />
      )}
      {showShareModal && (
        <ShareCatalogModal
          slug={catalog.slug}
          name={catalog.name}
          description={catalog.description}
          onClose={() => setShowShareModal(false)}
        />
      )}
      <PublicStickyActions shopName={shop.name} phone={shop.phone} topic={catalog.name} style={currentStyle} entry={entry} productsAnchorId={PRODUCTS_ANCHOR_ID} />
      <footer
        className="mt-12 text-center text-caption max-w-4xl mx-auto px-4"
        style={{ color: currentStyle.tokens.textSecondary }}
      >
        <div className="border-t pt-6" style={{ borderColor: currentStyle.tokens.border }}>
          <p className="font-medium">{shop.name}</p>
        </div>
      </footer>
    </div>
  )
}
