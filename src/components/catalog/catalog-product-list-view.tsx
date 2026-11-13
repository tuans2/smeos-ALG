"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Check, ShoppingBag } from "@/components/ui/icons"
import type { PublicCatalogProduct, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { formatVnd } from "./product-detail-modal"
import { CardOrderAction } from "./cards/card-order-action"
import type { PublicEntry } from "./public/public-entry"
import { SmartFlowerImage } from "./smart-flower-image"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { CatalogCardOverlay } from "./cards/catalog-card-overlay"
import { CatalogCardPaper } from "./cards/catalog-card-paper"
import { CatalogCardGlass } from "./cards/catalog-card-glass"

interface CatalogProductListViewProps {
  products: PublicCatalogProduct[]
  catalogStyle: "grid" | "lookbook" | "compact"
  shop: PublicCatalogShop
  style?: StyleDefinition | undefined
  onSelectProduct: (product: PublicCatalogProduct) => void
  entry: PublicEntry
  onOrderProduct: (product: PublicCatalogProduct) => void
  onResetFilter: () => void
}

export function CatalogProductListView({
  products,
  catalogStyle,
  shop,
  style,
  onSelectProduct,
  entry,
  onOrderProduct,
  onResetFilter,
}: CatalogProductListViewProps) {
  const fontDisplay = style?.typography.fontDisplay || ""
  const accentColor = style?.tokens.accent || "#9A3412"
  const priceColor = style?.tokens.price || accentColor
  const surfaceStyle = style ? { backgroundColor: style.tokens.surface, borderColor: style.tokens.border } : {}
  const textPrimaryStyle = style ? { color: style.tokens.textPrimary } : {}
  const textSecondaryStyle = style ? { color: style.tokens.textSecondary } : {}

  const infoMode = style?.imageRules.infoMode || "paper"

  const renderProductCard = (p: PublicCatalogProduct, idx: number, aspect: "square" | "4/5" = "square") => {
    if (infoMode === "overlay") {
      return (
        <CatalogCardOverlay
          key={p.id}
          product={p}
          index={idx}
          shop={shop}
          style={style}
          onSelectProduct={onSelectProduct}
          entry={entry}
          onOrderProduct={onOrderProduct}
        />
      )
    }

    if (infoMode === "glass") {
      return (
        <CatalogCardGlass
          key={p.id}
          product={p}
          index={idx}
          shop={shop}
          style={style}
          onSelectProduct={onSelectProduct}
          entry={entry}
          onOrderProduct={onOrderProduct}
        />
      )
    }

    // Default to paper mode (Editorial, Minimal, Quiet Luxury, etc.)
    return (
      <CatalogCardPaper
        key={p.id}
        product={p}
        index={idx}
        shop={shop}
        style={style}
        aspectRatio={aspect}
        onSelectProduct={onSelectProduct}
        entry={entry}
        onOrderProduct={onOrderProduct}
      />
    )
  }

  return (
    <main>
      <div className="flex items-center justify-between text-caption text-text-muted mb-3 px-1">
        <span style={textSecondaryStyle}>
          Hiển thị <strong>{products.length}</strong> sản phẩm
        </span>
        <span className="flex items-center gap-1 font-medium" style={{ color: accentColor }}>
          <Check size={13} />
          Sản phẩm của tiệm
        </span>
      </div>

      {products.length === 0 ? (
        <div
          style={surfaceStyle}
          className="rounded-3xl p-12 text-center border shadow-xs my-6"
        >
          <ShoppingBag size={40} className="mx-auto text-text-muted mb-3" />
          <h3 className={`text-body font-bold ${fontDisplay}`} style={textPrimaryStyle}>
            Không tìm thấy sản phẩm phù hợp
          </h3>
          <p className="text-caption text-text-muted mt-1 max-w-sm mx-auto" style={textSecondaryStyle}>
            Hãy thử từ khóa khác hoặc bấm nút bên dưới để xem lại toàn bộ danh mục.
          </p>
          <Button variant="ghost" type="submit"
            onClick={onResetFilter}
            style={{ backgroundColor: style?.tokens.ctaBg || accentColor, color: style?.tokens.ctaText || "#FFFFFF" }}
            className="h-auto gap-0 mt-4 px-4 py-2 rounded-xl text-caption font-bold transition-all shadow-sm active:scale-95"
          >
            Xem lại tất cả
          </Button>
        </div>
      ) : catalogStyle === "lookbook" ? (
        /* Editorial Lookbook Style — 2 columns with 4/5 aspect ratio */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {products.map((p, idx) => renderProductCard(p, idx, "4/5"))}
        </div>
      ) : catalogStyle === "compact" ? (
        /* Compact List Style */
        <div className="space-y-2.5">
          {products.map((p, idx) => (
            <div
              key={p.id}
              style={surfaceStyle}
              className="p-3.5 rounded-2xl bg-surface border shadow-xs flex items-center justify-between gap-3 hover:border-primary transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-14 h-14 rounded-xl bg-surface-alt overflow-hidden shrink-0 border"
                  style={{ borderColor: style?.tokens.border || undefined }}
                >
                  <SmartFlowerImage
                    src={p.imageUrl}
                    alt={p.name}
                    aspectRatio="square"
                    fallbackIndex={idx}
                    fitMode={style?.imageRules.fitMode || "cover"}
                    blendMode={style?.imageRules.blendMode}
                    imageFilter={style?.tokens.photoFilter}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-caption font-mono font-bold text-text-muted">{p.code}</span>
                    <h2 className={`text-caption font-bold truncate ${fontDisplay}`} style={textPrimaryStyle}>
                      {p.name}
                    </h2>
                  </div>
                  <div className="text-caption mt-0.5 truncate" style={textSecondaryStyle}>
                    {p.category || "Sản phẩm chọn lọc"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="text-caption text-text-muted" style={textSecondaryStyle}>
                    Giá
                  </div>
                  <div className="text-caption font-black" style={{ color: priceColor }}>
                    {formatVnd(p.price)}
                  </div>
                </div>
                <CardOrderAction product={p} shop={shop} entry={entry} onOrderProduct={onOrderProduct} ctaBg={style?.tokens.ctaBg || accentColor} ctaText={style?.tokens.ctaText || "#FFFFFF"} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Lưới chuẩn thương mại: 2 cột trên di động, 3 cột desktop, ảnh dọc 4:5 */
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {products.map((p, idx) => renderProductCard(p, idx, "4/5"))}
        </div>
      )}
    </main>
  )
}
