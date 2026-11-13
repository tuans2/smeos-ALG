"use client"

import { Button } from "@/components/ui/button"
import React, { useMemo } from "react"
import { Phone, Share2, MapPin, Flower2 } from "@/components/ui/icons"
import { CatalogPdfExportButton } from "./studio/catalog-pdf-export-button"
import type {
  CatalogTemplateId,
  CatalogStyleId,
  CatalogProductItem,
  BrandProfile,
  StyleDefinition,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { resolveCatalogBrief } from "@/modules/catalog-studio/use-cases/resolve-catalog-brief"
import type { PublicCatalogProduct } from "@/modules/catalog-links/use-cases/get-public-catalog"

interface CatalogStorefrontHeaderProps {
  shop: {
    id?: string
    name: string
    logoUrl?: string | null
    phone?: string | null
    address?: string | null
  }
  catalog: {
    id?: string
    name: string
    description?: string | null
    filters?: Record<string, unknown> | null
  }
  products: PublicCatalogProduct[]
  onOpenShareModal: () => void
  style?: StyleDefinition
  templateId?: CatalogTemplateId
  styleId?: CatalogStyleId
  /** Điều hành tắt "Liên hệ" cho nguồn này → ẩn nút gọi */
  contactEnabled?: boolean
}

export function CatalogStorefrontHeader({
  shop,
  catalog,
  products,
  onOpenShareModal,
  style,
  templateId,
  styleId,
  contactEnabled = true,
}: CatalogStorefrontHeaderProps) {
  const studioProducts: CatalogProductItem[] = useMemo(() => {
    return products.map((p, idx) => ({
      productId: p.id,
      name: p.name,
      code: p.code || p.id,
      category: p.category,
      primaryImage: p.imageUrl || null,
      description: p.description,
      ...(p.stemCount ? { attributes: { stemCount: p.stemCount } } : {}),
      price: p.price ?? null,
      currency: "VND",
      sortOrder: idx + 1,
      status: "ACTIVE",
    }))
  }, [products])

  const brandProfile: BrandProfile = useMemo(() => ({
    brandId: shop.id || "shop",
    name: shop.name,
    slogan: catalog.description || null,
    brandColors: { primary: style?.tokens.accent || "#9A3412" },
    contacts: {
      phone: shop.phone || null,
      hotline: shop.phone || null,
      zalo: shop.phone || null,
      address: shop.address || null,
    },
  }), [shop, catalog, style])

  const resolvedCatalog = useMemo(() => {
    const filters = (catalog.filters as Record<string, unknown>) || {}
    const resolvedTemplateId = templateId || (filters.template_id as CatalogTemplateId) || (filters.templateId as CatalogTemplateId) || "T01_SIGNATURE_COLLECTION"
    const resolvedStyleId = styleId || (filters.style_id as CatalogStyleId) || (filters.styleId as CatalogStyleId) || "S01_EDITORIAL_MAGAZINE"

    return resolveCatalogBrief(
      {
        catalogId: catalog.id || "catalog",
        title: catalog.name,
        purpose: "COLLECTION",
        audience: "CONSUMER",
        language: "vi-VN",
        styleId: resolvedStyleId,
        templateId: resolvedTemplateId,
        pageSize: "A4_PORTRAIT",
        outputProfile: "DIGITAL_PDF",
        brandId: brandProfile.brandId,
        productIds: studioProducts.map((p) => p.productId),
      },
      brandProfile,
      studioProducts
    )
  }, [catalog, brandProfile, studioProducts, templateId, styleId])

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b shadow-xs transition-colors"
      style={{
        backgroundColor: style ? `${style.tokens.surface}EE` : undefined,
        borderColor: style?.tokens.border,
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {shop.logoUrl ? (
            <img src={shop.logoUrl} alt={shop.name} className="w-10 h-10 rounded-full object-cover border border-border" />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              style={{
                backgroundColor: style?.tokens.badgeBg || "rgba(154, 52, 18, 0.1)",
                color: style?.tokens.accent || "#9A3412",
                borderColor: style?.tokens.border || "rgba(154, 52, 18, 0.2)",
              }}
            >
              <Flower2 size={20} />
            </div>
          )}
          <div>
            <div
              className="text-body-sm font-extrabold leading-tight"
              style={{ color: style?.tokens.textPrimary }}
            >
              {shop.name}
            </div>
            {shop.address && (
              <div
                className="text-caption flex items-center gap-1 mt-0.5 line-clamp-1"
                style={{ color: style?.tokens.textSecondary }}
              >
                <MapPin size={11} className="shrink-0" style={{ color: style?.tokens.accent || "#9A3412" }} />
                {shop.address}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút xuất PDF chuẩn A4 Universal Catalog Studio */}
          <CatalogPdfExportButton
            pages={resolvedCatalog.pages}
            style={resolvedCatalog.style}
            brand={resolvedCatalog.brand}
            catalogTitle={catalog.name}
            variant="outline"
            size="sm"
            className="text-caption rounded-full h-8 px-3"
          />

          <Button variant="ghost" type="submit"
            onClick={onOpenShareModal}
            aria-label="Chia sẻ"
            className="h-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-semibold transition-colors"
            style={{
              backgroundColor: style?.tokens.badgeBg || "rgba(154, 52, 18, 0.1)",
              color: style?.tokens.badgeText || "#9A3412",
            }}
          >
            <Share2 size={14} />
            <span className="hidden sm:inline">Chia sẻ</span>
          </Button>

          {contactEnabled && shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              aria-label={`Gọi ${shop.phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-caption font-bold shadow-sm transition-colors"
              style={{
                backgroundColor: style?.tokens.ctaBg || "#9A3412",
                color: style?.tokens.ctaText || "#FFFFFF",
              }}
            >
              <Phone size={13} />
              <span className="hidden sm:inline">{shop.phone}</span>
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
