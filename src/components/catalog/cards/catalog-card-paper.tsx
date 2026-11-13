"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import type { PublicCatalogProduct, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { SmartFlowerImage } from "../smart-flower-image"
import { formatVnd } from "../product-detail-modal"
import { CardOrderAction } from "./card-order-action"
import type { PublicEntry } from "../public/public-entry"

interface CatalogCardPaperProps {
  product: PublicCatalogProduct
  index: number
  shop: PublicCatalogShop
  style?: StyleDefinition | undefined
  aspectRatio?: "square" | "4/5" | undefined
  onSelectProduct: (product: PublicCatalogProduct) => void
  /** Nút Đặt hàng / Liên hệ theo cài đặt Điều hành */
  entry: PublicEntry
  onOrderProduct: (product: PublicCatalogProduct) => void
}

export function CatalogCardPaper({
  product,
  index,
  shop,
  style,
  aspectRatio = "square",
  onSelectProduct,
  entry,
  onOrderProduct,
}: CatalogCardPaperProps) {
  const fontDisplay = style?.typography.fontDisplay || ""
  const textPrimary = style?.tokens.textPrimary || "#1C1917"
  const textSecondary = style?.tokens.textSecondary || "#78716C"
  const priceColor = style?.tokens.price || textPrimary
  const ctaBg = style?.tokens.ctaBg || style?.tokens.accent || "#9A3412"
  const ctaText = style?.tokens.ctaText || "#FFFFFF"
  const cardBg = style?.tokens.cardBg || style?.tokens.surface || "#FFFFFF"
  const border = style?.tokens.border || "#E7E5E4"
  const shadowCard = style?.tokens.shadowCard || "0 4px 20px rgba(0,0,0,0.06)"
  const radiusPx = style?.imageRules.radiusPx ?? 12
  const innerFrame = style?.decorationRules.innerFrame

  const backdropGradient = style?.imageRules.useBackdrop
    ? `radial-gradient(90% 70% at 50% 40%, #ffffff 0%, ${cardBg} 70%)`
    : undefined

  return (
    <article
      className="group relative select-none overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
      style={{
        borderRadius: `${radiusPx}px`,
        background: cardBg,
        border: `1px solid ${border}`,
        boxShadow: shadowCard,
      }}
    >
      <Button variant="ghost"
        type="button"
        onClick={() => onSelectProduct(product)}
        className="h-auto px-0 py-0 text-[length:inherit] justify-start font-[inherit] gap-0 block w-full text-left"
      >
        <div className={`relative ${aspectRatio === "4/5" ? "aspect-4/5" : "aspect-square"} w-full overflow-hidden`}>
          <SmartFlowerImage
            src={product.imageUrl}
            alt={product.name}
            aspectRatio={aspectRatio}
            fallbackIndex={index}
            fitMode={style?.imageRules.fitMode || "contain"}
            blendMode={style?.imageRules.blendMode}
            imageFilter={style?.tokens.photoFilter}
            backdropGradient={backdropGradient}
          />

          {/* Top Code Badge */}
          <div
            className="absolute top-2.5 left-2.5 px-2.5 py-1 text-caption font-mono font-bold z-20 rounded-md backdrop-blur-sm"
            style={{
              backgroundColor: style?.tokens.badgeBg || "rgba(0,0,0,0.6)",
              color: style?.tokens.badgeText || "#FFFFFF",
            }}
          >
            {product.code}
          </div>

          {/* Inner Frame */}
          {innerFrame && (
            <div
              className="pointer-events-none absolute inset-2.5 z-10"
              style={{
                border: innerFrame,
                borderRadius: `${Math.max(0, radiusPx - 6)}px`,
              }}
            />
          )}
        </div>

        {/* Paper Info Area */}
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
              className="text-caption mt-1 line-clamp-2 leading-relaxed"
              style={{ color: textSecondary }}
            >
              {product.description}
            </p>
          )}
        </div>
      </Button>

      {/* Footer / Price & Action */}
      <div
        className="p-4 pt-3 border-t flex items-center justify-between mt-auto"
        style={{ borderColor: border }}
      >
        <div>
          <div className="text-body-sm md:text-body font-extrabold tracking-tight whitespace-nowrap" style={{ color: priceColor }}>
            {formatVnd(product.price)}
          </div>
        </div>
        <CardOrderAction product={product} shop={shop} entry={entry} onOrderProduct={onOrderProduct} ctaBg={ctaBg} ctaText={ctaText} />
      </div>
    </article>
  )
}
