"use client"

import React from "react"
import type {
  CatalogProductItem,
  StyleDefinition,
  BrandProfile,
} from "@/modules/catalog-studio/domain/entities/catalog-studio.types"
import { PosterProductGrid } from "./catalog-cover-poster-grid"

interface CatalogCoverPosterProps {
  products: CatalogProductItem[]
  style: StyleDefinition
  brand: BrandProfile
  catalogTitle: string
  catalogUrl?: string
  productCount?: number
}

function cleanDisplayUrl(url?: string): string {
  if (!url) return ""
  return url.replace(/^https?:\/\/(localhost:\d+|127\.0\.0\.1:\d+)/, "avilotusgroup.com").replace(/^https?:\/\//, "")
}

/**
 * Catalog Cover Poster — Square 1080×1080 (Instagram / Zalo / Facebook-ready)
 * Redesigned with Editorial Bento Grid that dynamically adapts to 1, 2, 3, 4, 5, 6 items.
 * Strictly 0 empty/broken grid cells.
 */
export function CatalogCoverPoster({
  products,
  style,
  brand,
  catalogTitle,
  catalogUrl,
  productCount,
}: CatalogCoverPosterProps) {
  const { tokens } = style
  const showcaseProducts = products.slice(0, 6)
  const totalCount = productCount ?? products.length

  // "font-display" (Fraunces) và "font-serif" là chữ có chân; còn lại dùng chữ không chân đã nạp sẵn
  const isSerif = /serif|display/.test(style.typography.fontDisplay)
  const displayFont = isSerif
    ? '"Fraunces", "Playfair Display", Georgia, serif'
    : '"Be Vietnam Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

  const accentColor = tokens.ctaBg || tokens.accent || "#9A3412"
  // Thanh trên in chữ trắng → nền phải là màu nút đậm (đã đạt tương phản), không dùng nền sân khấu nhạt
  const stageBg = accentColor
  const barText = tokens.ctaText || "#FFFFFF"

  return (
    <div
      data-poster-root
      style={{
        width: "1080px",
        height: "1080px",
        backgroundColor: tokens.background || "#FAF8F5",
        color: tokens.textPrimary || "#1C1917",
        fontFamily: displayFont,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Top Brand Bar */}
      <div
        style={{
          background: stageBg,
          padding: "26px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: "1px solid rgba(255,255,255,0.12)",
        }}
      >
        <div>
          <div
            style={{
              color: barText,
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              fontFamily: displayFont,
            }}
          >
            {brand.name}
          </div>
          <div
            style={{
              color: barText,
              fontSize: "12px",
              marginTop: "4px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Bộ sưu tập {new Date().getFullYear()}
          </div>
        </div>

        <div
          style={{
            backgroundColor: "rgba(255,255,255,0.18)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "30px",
            padding: "8px 20px",
            color: barText,
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {totalCount} mẫu
        </div>
      </div>

      {/* Adaptive Product Grid — Adapts intelligently to 1, 2, 3, 4, 5, 6 items */}
      <PosterProductGrid products={showcaseProducts} accentColor={accentColor} />

      {/* Bottom Info Bar */}
      <div
        style={{
          backgroundColor: tokens.cardBg || tokens.surface || "#FFFFFF",
          borderTop: `2px solid ${tokens.border || "#E7E5E4"}`,
          padding: "22px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ maxWidth: "680px" }}>
          <div
            style={{
              fontSize: "26px",
              fontWeight: 800,
              color: tokens.textPrimary || "#1C1917",
              letterSpacing: "-0.01em",
              lineHeight: 1.25,
              fontFamily: displayFont,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {catalogTitle}
          </div>

          <div
            style={{
              fontSize: "13px",
              color: tokens.textSecondary || "#78716C",
              marginTop: "5px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {brand.contacts.phone && (
              <>
                <span style={{ fontWeight: 600 }}>Hotline: {brand.contacts.phone}</span>
                <span style={{ opacity: 0.4 }}>•</span>
              </>
            )}
            {catalogUrl ? (
              <span
                style={{
                  color: accentColor,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "420px",
                  whiteSpace: "nowrap",
                }}
              >
                {cleanDisplayUrl(catalogUrl)}
              </span>
            ) : (
              <span style={{ fontStyle: "italic" }}>Quét mã QR để xem trọn bộ sưu tập</span>
            )}
          </div>
        </div>

        {/* Editorial Collection Badge */}
        <div
          style={{
            backgroundColor: tokens.badgeBg || "rgba(0,0,0,0.05)",
            border: `1px solid ${tokens.border || "rgba(0,0,0,0.08)"}`,
            borderRadius: "14px",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: tokens.textSecondary || "#44403C",
            fontSize: "12px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            flexShrink: 0,
          }}
        >
          <span style={{ color: accentColor }}>✦</span>
          <span>{brand.contacts.phone ? "Nhắn Zalo để đặt" : "Bộ sưu tập mới"}</span>
        </div>
      </div>
    </div>
  )
}
