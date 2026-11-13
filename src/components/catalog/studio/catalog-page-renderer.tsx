"use client"

import React from "react"
import type {
  CatalogPageModel,
  StyleDefinition,
  BrandProfile,
  CatalogProductItem,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { Flower2, Phone, MapPin, Sparkles, ShoppingBag, CheckCircle2 } from "@/components/ui/icons"
import { formatCurrency } from "@/lib/i18n/formatters"
import { publicThemeVars } from "../public/public-theme-vars"
import { CollectionDividerLayout, ProductDetailLayout } from "./catalog-page-extra-layouts"

interface CatalogPageRendererProps {
  page: CatalogPageModel
  style: StyleDefinition
  brand: BrandProfile
  totalPages?: number
  isPrintMode?: boolean
}

export function CatalogPageRenderer({
  page,
  style,
  brand,
  totalPages = 1,
  isPrintMode = false,
}: CatalogPageRendererProps) {
  const { tokens, typography, imageRules, decorationRules } = style

  const formatPrice = (price: number | null | undefined) => {
    if (price == null || price === 0) return "Liên hệ"
    return formatCurrency(price)
  }

  // Base A4 container styles (210mm x 297mm proportion: 1 / 1.414)
  return (
    <div
      style={{
        // Class ngữ nghĩa (text-text-muted, bg-surface…) trong trang theo màu phong cách, không theo màu quản trị
        ...publicThemeVars(style),
        backgroundColor: tokens.background,
        color: tokens.textPrimary,
        borderColor: tokens.border,
      }}
      className={`relative mx-auto flex flex-col justify-between overflow-hidden transition-all duration-300 ${
        isPrintMode
          ? "w-[210mm] h-[297mm] p-[16mm] box-border shadow-none"
          : "w-full max-w-[580px] min-h-[820px] p-6 sm:p-8 rounded-2xl shadow-xl border my-4"
      }`}
    >
      {/* Decorative hairline */}
      {decorationRules.showHairline && (
        <div
          className="absolute inset-x-8 top-3 h-[1px] opacity-40"
          style={{ backgroundColor: tokens.accent }}
        />
      )}

      {/* Header / Brand Bar (Non-cover pages) */}
      {page.layoutId !== "L01_COVER" && (
        <header className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.border }}>
          <div className="flex items-center gap-2">
            <span className="text-caption font-bold tracking-widest uppercase" style={{ color: tokens.accent }}>
              {brand.name}
            </span>
            <span className="text-caption text-text-muted">•</span>
            <span className="text-caption text-text-muted truncate max-w-[200px]">{page.subtitle || page.title}</span>
          </div>
          <span className="text-caption font-mono font-medium text-text-muted">
            {page.pageNumber} / {totalPages}
          </span>
        </header>
      )}

      {/* Main Page Content Body */}
      <main className="flex-1 flex flex-col justify-center my-4">
        {/* L01: COVER */}
        {page.layoutId === "L01_COVER" && (
          <div className="flex flex-col items-center justify-between h-full py-6 text-center space-y-6">
            <div className="space-y-2">
              <span
                className="inline-block px-3 py-1 rounded-full text-caption font-bold tracking-widest uppercase"
                style={{ backgroundColor: tokens.badgeBg, color: tokens.badgeText }}
              >
                Bộ sưu tập {new Date().getFullYear()}
              </span>
              <div className="text-caption tracking-[0.2em] uppercase font-bold" style={{ color: tokens.accent }}>
                {brand.name}
              </div>
            </div>

            <div className="space-y-3 max-w-[440px]">
              <h2 className={`${typography.scale.cover} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
                {page.title}
              </h2>
              {page.subtitle && (
                <p className={`${typography.scale.subheading}`} style={{ color: tokens.textSecondary }}>
                  {page.subtitle}
                </p>
              )}
            </div>

            {page.heroImage ? (
              <div
                className={`w-full max-h-[380px] overflow-hidden ${imageRules.borderRadius} ${imageRules.shadow}`}
                style={{ borderColor: tokens.border, borderWidth: imageRules.hasBorder ? 1 : 0 }}
              >
                <img
                  src={page.heroImage}
                  alt={page.title}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>
            ) : (
              <div className="w-full h-64 rounded-xl bg-surface-alt flex items-center justify-center text-text-muted">
                <Flower2 className="h-12 w-12 stroke-[1.5]" />
              </div>
            )}

            {brand.slogan && (
              <div className="pt-4 text-caption text-text-muted tracking-wider">{brand.slogan}</div>
            )}
          </div>
        )}

        {/* L02: BRAND STORY */}
        {page.layoutId === "L02_BRAND_STORY" && (
          <div className="flex flex-col justify-center h-full max-w-[480px] mx-auto space-y-6 text-left py-4">
            <div className="space-y-1">
              <span className="text-caption font-bold tracking-widest uppercase" style={{ color: tokens.accent }}>
                Câu chuyện của tiệm
              </span>
              <h2 className={`${typography.scale.title} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
                {page.contentBlock?.heading || page.title}
              </h2>
            </div>

            {page.heroImage && (
              <div className={`w-full h-56 overflow-hidden ${imageRules.borderRadius}`}>
                <img src={page.heroImage} alt="Story" className="w-full h-full object-cover" />
              </div>
            )}

            <p className={`${typography.scale.body}`} style={{ color: tokens.textSecondary }}>
              {page.contentBlock?.body}
            </p>

            {page.contentBlock?.quote && (
              <blockquote
                className="border-l-2 pl-4 py-1 italic text-body-sm font-medium"
                style={{ borderColor: tokens.accent, color: tokens.textPrimary }}
              >
                &ldquo;{page.contentBlock.quote}&rdquo;
              </blockquote>
            )}
          </div>
        )}

        {/* L04: HERO PRODUCT */}
        {page.layoutId === "L04_HERO_PRODUCT" && page.products[0] && (
          <div className="flex flex-col justify-between h-full space-y-4">
            <div className="space-y-1">
              <span className="text-caption font-bold tracking-widest uppercase" style={{ color: tokens.accent }}>
                Mẫu nổi bật
              </span>
              <h2 className={`${typography.scale.title} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
                {page.products[0].name}
              </h2>
            </div>

            {page.products[0].primaryImage && (
              <div className={`w-full h-80 overflow-hidden ${imageRules.borderRadius} ${imageRules.shadow}`}>
                <img src={page.products[0].primaryImage} alt={page.products[0].name} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-baseline justify-between pt-2">
              <div className="text-caption font-mono font-bold text-text-muted">
                Mã: {page.products[0].code}
              </div>
              <div className="text-title font-bold" style={{ color: tokens.price }}>
                {formatPrice(page.products[0].price)}
              </div>
            </div>

            <p className={`${typography.scale.body}`} style={{ color: tokens.textSecondary }}>
              {page.contentBlock?.body}
            </p>
          </div>
        )}

        {/* L05: PRODUCT GRID */}
        {page.layoutId === "L05_PRODUCT_GRID" && (
          <div className="flex flex-col h-full justify-between space-y-4">
            <div className="border-b pb-2" style={{ borderColor: tokens.border }}>
              <h3 className={`${typography.scale.heading} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
                {page.title}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 items-start">
              {page.products.map((prod) => (
                <div
                  key={prod.productId}
                  className={`flex flex-col p-2.5 rounded-xl border transition-all ${
                    style.decorationRules.hasGlassmorphism ? "bg-surface/70 backdrop-blur-xs" : "bg-surface"
                  }`}
                  style={{ borderColor: tokens.border }}
                >
                  <div
                    className={`w-full aspect-[4/5] overflow-hidden mb-2 rounded-lg bg-surface-alt ${imageRules.shadow}`}
                  >
                    {prod.primaryImage ? (
                      <img src={prod.primaryImage} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted">
                        <Flower2 className="h-8 w-8 stroke-[1.5]" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 justify-between">
                    <div>
                      <div className="text-caption font-mono text-text-muted font-bold">{prod.code}</div>
                      <div className="text-caption font-bold text-text line-clamp-2 leading-snug">{prod.name}</div>
                    </div>
                    <div className="mt-1.5 text-body-sm font-black" style={{ color: tokens.price }}>
                      {formatPrice(prod.price)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {page.layoutId === "L03_COLLECTION_DIVIDER" && <CollectionDividerLayout page={page} style={style} />}
        {page.layoutId === "L06_PRODUCT_DETAIL" && <ProductDetailLayout page={page} style={style} />}

        {/* L08: CLOSING */}
        {page.layoutId === "L08_CLOSING" && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-[440px] mx-auto py-6">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: tokens.badgeBg, color: tokens.accent }}>
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-2">
              <h2 className={`${typography.scale.title} ${typography.fontDisplay}`} style={{ color: tokens.textPrimary }}>
                {page.contentBlock?.heading || "Đặt hoa"}
              </h2>
              <p className={`${typography.scale.body}`} style={{ color: tokens.textSecondary }}>
                {page.contentBlock?.body}
              </p>
            </div>

            <div className="w-full rounded-2xl p-4 border space-y-2.5 text-left text-caption" style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}>
              <div className="font-bold text-text-muted">Liên hệ đặt hoa</div>
              {brand.contacts.hotline && (
                <div className="flex items-center gap-2 text-text">
                  <Phone className="h-4 w-4 text-text-muted" />
                  <span>Hotline: <strong className="text-text">{brand.contacts.hotline}</strong></span>
                </div>
              )}
              {brand.contacts.zalo && (
                <div className="flex items-center gap-2 text-text">
                  <span className="font-bold text-primary font-mono text-caption px-1 bg-primary-muted rounded">Zalo</span>
                  <span>Tư vấn: <strong className="text-text">{brand.contacts.zalo}</strong></span>
                </div>
              )}
              {brand.contacts.address && (
                <div className="flex items-center gap-2 text-text">
                  <MapPin className="h-4 w-4 text-text-muted shrink-0" />
                  <span className="truncate">{brand.contacts.address}</span>
                </div>
              )}
            </div>

            {page.contentBlock?.quote && (
              <div className="text-caption font-medium text-text-muted italic">
                {page.contentBlock.quote}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer / Page Number */}
      <footer className="flex items-center justify-between text-caption text-text-muted pt-3 border-t" style={{ borderColor: tokens.border }}>
        <span>{brand.name}</span>
        <span className="font-mono">Trang {page.pageNumber}</span>
      </footer>
    </div>
  )
}
