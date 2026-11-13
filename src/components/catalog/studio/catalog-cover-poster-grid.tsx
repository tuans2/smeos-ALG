"use client"

import React from "react"
import type { CatalogProductItem } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

function formatPrice(price: number | null | undefined): string | null {
  if (!price) return null
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1).replace(".0", "")}M₫`
  if (price >= 1_000) return `${Math.round(price / 1_000)}K₫`
  return `${price}₫`
}

export function PosterProductCell({
  product,
  isFeatured = false,
  accentColor,
}: {
  product: CatalogProductItem
  isFeatured?: boolean
  accentColor: string
}) {
  const priceText = formatPrice(product.price)

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#F4EFEA" }}>
      {product.primaryImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.primaryImage}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#EAE3D8" }}>
          <span style={{ fontSize: "14px", color: "#8C827A", fontWeight: 600 }}>Chưa có ảnh</span>
        </div>
      )}

      {/* Featured Badge */}
      {isFeatured && (
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            backgroundColor: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(6px)",
            color: "#FFFFFF",
            fontSize: "11px",
            fontWeight: 800,
            padding: "5px 12px",
            borderRadius: "20px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            border: "1px solid rgba(255,255,255,0.2)",
          }}
        >
          ✦ Nổi bật
        </div>
      )}

      {/* Scrim Gradient for legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.72) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Bottom info: Product Name & Price */}
      <div
        style={{
          position: "absolute",
          left: "14px",
          right: "14px",
          bottom: "12px",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "8px",
          zIndex: 10,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: isFeatured ? "16px" : "14px",
              fontWeight: 700,
              lineHeight: 1.25,
              textShadow: "0 1px 4px rgba(0,0,0,0.6)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {product.name}
          </div>
        </div>

        {priceText && (
          <div
            style={{
              backgroundColor: accentColor,
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: 800,
              padding: "4px 10px",
              borderRadius: "14px",
              letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {priceText}
          </div>
        )}
      </div>
    </div>
  )
}

export function PosterProductGrid({
  products,
  accentColor,
}: {
  products: CatalogProductItem[]
  accentColor: string
}) {
  const count = products.length

  if (count === 1 && products[0]) {
    return (
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <PosterProductCell product={products[0]} isFeatured={true} accentColor={accentColor} />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px", backgroundColor: "#D6CECE", overflow: "hidden" }}>
        {products.map((p, i) => (
          <PosterProductCell key={p.productId} product={p} isFeatured={i === 0} accentColor={accentColor} />
        ))}
      </div>
    )
  }

  // 3 Products — Editorial Bento Feature: 1 Hero left (58%), 2 Stacked right (42%)
  // Completely eliminates empty/blank 4th cell
  if (count === 3 && products[0] && products[1] && products[2]) {
    return (
      <div style={{ flex: 1, display: "flex", gap: "3px", backgroundColor: "#D6CECE", overflow: "hidden" }}>
        <div style={{ flex: 1.35, height: "100%", position: "relative" }}>
          <PosterProductCell product={products[0]} isFeatured={true} accentColor={accentColor} />
        </div>
        <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", gap: "3px" }}>
          <div style={{ flex: 1, position: "relative" }}>
            <PosterProductCell product={products[1]} isFeatured={false} accentColor={accentColor} />
          </div>
          <div style={{ flex: 1, position: "relative" }}>
            <PosterProductCell product={products[2]} isFeatured={false} accentColor={accentColor} />
          </div>
        </div>
      </div>
    )
  }

  if (count === 4) {
    return (
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "3px", backgroundColor: "#D6CECE", overflow: "hidden" }}>
        {products.map((p, i) => (
          <PosterProductCell key={p.productId} product={p} isFeatured={i === 0} accentColor={accentColor} />
        ))}
      </div>
    )
  }

  if (count === 5 && products[0]) {
    return (
      <div style={{ flex: 1, display: "flex", gap: "3px", backgroundColor: "#D6CECE", overflow: "hidden" }}>
        <div style={{ flex: 1.15, height: "100%", position: "relative" }}>
          <PosterProductCell product={products[0]} isFeatured={true} accentColor={accentColor} />
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "3px" }}>
          {products.slice(1, 5).map((p) => (
            <PosterProductCell key={p.productId} product={p} isFeatured={false} accentColor={accentColor} />
          ))}
        </div>
      </div>
    )
  }

  // 6 or more products: 3 cols x 2 rows
  return (
    <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "1fr 1fr", gap: "3px", backgroundColor: "#D6CECE", overflow: "hidden" }}>
      {products.slice(0, 6).map((p, i) => (
        <PosterProductCell key={p.productId} product={p} isFeatured={i === 0} accentColor={accentColor} />
      ))}
    </div>
  )
}
