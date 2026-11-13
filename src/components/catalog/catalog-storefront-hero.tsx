"use client"

import React from "react"
import { Sparkles } from "@/components/ui/icons"
import type { StyleDefinition, CatalogTemplatePrototype } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

interface CatalogStorefrontHeroProps {
  catalogName: string
  catalogDescription?: string | null
  style: StyleDefinition
  template: CatalogTemplatePrototype
  customerName?: string | null
  brandName: string
  productCount: number
}

export function CatalogStorefrontHero({
  catalogName,
  catalogDescription,
  style,
  template,
  customerName,
  brandName,
  productCount,
}: CatalogStorefrontHeroProps) {
  const isDarkStage = style.id === "S11_DARK_SHOWCASE" || style.tokens.background === "#09090B"

  return (
    <div
      style={{
        background: style.tokens.stage,
        borderColor: style.tokens.border,
        boxShadow: style.tokens.shadowCard,
      }}
      className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border transition-all duration-300"
    >
      <div className="relative z-10 max-w-2xl space-y-3">
        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          {customerName ? (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold uppercase tracking-wider shadow-xs"
              style={{
                backgroundColor: style.tokens.badgeBg,
                color: style.tokens.accent,
              }}
            >
              <Sparkles size={13} />
              <span>Dành riêng cho {customerName}</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-caption font-bold uppercase tracking-wider shadow-xs"
              style={{
                backgroundColor: style.tokens.badgeBg,
                color: style.tokens.badgeText,
              }}
            >
              <Sparkles size={13} />
              <span>Bộ sưu tập</span>
            </div>
          )}

          <span
            className="text-caption font-mono px-2.5 py-0.5 rounded-full border backdrop-blur-sm opacity-90"
            style={{
              borderColor: style.tokens.border,
              backgroundColor: isDarkStage ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
              color: style.tokens.textSecondary,
            }}
          >
            {brandName} • {productCount} sản phẩm
          </span>
        </div>

        {/* Catalog Title */}
        <h1
          className={`text-title sm:text-display font-black tracking-tight leading-snug ${style.typography.fontDisplay}`}
          style={{ color: style.tokens.textPrimary }}
        >
          {catalogName}
        </h1>

        {/* Catalog Description */}
        {catalogDescription && (
          <p
            className={`text-body-sm leading-relaxed max-w-xl opacity-90 ${style.typography.fontBody}`}
            style={{ color: style.tokens.textSecondary }}
          >
            {catalogDescription}
          </p>
        )}
      </div>

      {/* Decorative ambient glow driven by accent color */}
      <div
        className="absolute right-0 top-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
        style={{ backgroundColor: style.tokens.accent }}
      />
    </div>
  )
}
