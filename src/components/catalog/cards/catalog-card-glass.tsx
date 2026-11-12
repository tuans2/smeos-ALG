"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import type { PublicCatalogProduct, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { SmartFlowerImage } from "../smart-flower-image"
import { formatVnd } from "../product-detail-modal"
import { CardOrderAction } from "./card-order-action"
import type { PublicEntry } from "../public/public-entry"

interface CatalogCardGlassProps {
  product: PublicCatalogProduct
  index: number
  shop: PublicCatalogShop
  style?: StyleDefinition | undefined
  onSelectProduct: (product: PublicCatalogProduct) => void
  /** Nút Đặt hàng / Liên hệ theo cài đặt Điều hành */
  entry: PublicEntry
  onOrderProduct: (product: PublicCatalogProduct) => void
}

export function CatalogCardGlass({
  product,
  index,
  shop,
  style,
  onSelectProduct,
  entry,
  onOrderProduct,
}: CatalogCardGlassProps) {
  const fontDisplay = style?.typography.fontDisplay || ""
  const textPrimary = style?.tokens.textPrimary || "#0F172A"
  const textSecondary = style?.tokens.textSecondary || "#64748B"
  const priceColor = style?.tokens.price || "#4F46E5"
  const ctaBg = style?.tokens.ctaBg || "#6366F1"
  const ctaText = style?.tokens.ctaText || "#FFFFFF"
  const cardBg = style?.tokens.cardBg || "rgba(255,255,255,0.08)"
  const shadowCard = style?.tokens.shadowCard || "0 8px 32px rgba(15,23,42,0.25)"
  const radiusPx = style?.imageRules.radiusPx ?? 24

  return (
    <article
      className="group relative select-none overflow-hidden transition-all duration-300 hover:-translate-y-1 backdrop-blur-xl flex flex-col justify-between"
      style={{
        borderRadius: `${radiusPx}px`,
        background: cardBg,
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: shadowCard,
      }}
    >
      <Button variant="ghost"
        type="button"
        onClick={() => onSelectProduct(product)}
        className="h-auto px-0 py-0 text-[length:inherit] justify-start font-[inherit] gap-0 block w-full text-left"
      >
        <div className="relative aspect-square w-full overflow-hidden p-2.5 pb-0">
          <div className="relative w-full h-full overflow-hidden rounded-2xl">
            <SmartFlowerImage
              src={product.imageUrl}
              alt={product.name}
              aspectRatio="square"
              fallbackIndex={index}
              fitMode={style?.imageRules.fitMode || "cover"}
              blendMode={style?.imageRules.blendMode}
              imageFilter={style?.tokens.photoFilter}
            />

            {/* Top Code Badge */}
            <div
              className="absolute top-2 left-2 px-2.5 py-1 text-caption font-mono font-bold z-20 rounded-lg backdrop-blur-md"
              style={{
                backgroundColor: style?.tokens.badgeBg || "rgba(255,255,255,0.85)",
                color: style?.tokens.badgeText || "#4338CA",
              }}
            >
              {product.code}
            </div>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-4 pb-2">
          {product.category && (
            <span
              className="text-caption uppercase tracking-wider font-semibold block mb-1"
              style={{ color: textSecondary }}
            >
              {product.category}
            </span>
          )}
          <h2
            className={`text-body-sm md:text-body font-bold leading-snug line-clamp-1 ${fontDisplay}`}
            style={{ color: textPrimary }}
          >
            {product.name}
          </h2>
          {product.description && (
            <p
              className="text-caption mt-1 line-clamp-2 leading-relaxed opacity-80"
              style={{ color: textSecondary }}
            >
              {product.description}
            </p>
          )}
        </div>
      </Button>

      {/* Footer / Price & Action */}
      <div
        className="p-4 pt-3 border-t border-white/10 flex items-center justify-between mt-auto"
      >
        <div>
          <div className="text-body-sm md:text-body font-black tracking-tight whitespace-nowrap" style={{ color: priceColor }}>
            {formatVnd(product.price)}
          </div>
        </div>
        <CardOrderAction product={product} shop={shop} entry={entry} onOrderProduct={onOrderProduct} ctaBg={ctaBg} ctaText={ctaText} />
      </div>
    </article>
  )
}
