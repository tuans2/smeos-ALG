"use client"

import React from "react"
import { MessageCircle, ShoppingBag } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import type { PublicCatalogProduct, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import type { PublicEntry } from "../public/public-entry"
import { getZaloUrl } from "../product-detail-modal"

interface CardOrderActionProps {
  product: PublicCatalogProduct
  shop: PublicCatalogShop
  entry: PublicEntry
  onOrderProduct: (product: PublicCatalogProduct) => void
  ctaBg: string
  ctaText: string
  className?: string
}

/**
 * Nút hành động trên thẻ sản phẩm: Điều hành bật "Đặt hàng" → mở form đặt hàng trực tuyến;
 * chỉ bật "Liên hệ" → nhắn Zalo đặt mẫu. Trên di động chỉ còn biểu tượng (vẫn có nhãn truy cập).
 */
export function CardOrderAction({ product, shop, entry, onOrderProduct, ctaBg, ctaText, className = "" }: CardOrderActionProps) {
  const base = `pointer-events-auto inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-caption font-bold shadow-xs transition-all active:scale-95 ${className}`
  if (entry.order) {
    return (
      // Màu nút theo phong cách catalog (style ghi đè màu mặc định của Button)
      <Button size="xs" onClick={() => onOrderProduct(product)} aria-label={`Đặt hàng ${product.name}`} className={base} style={{ backgroundColor: ctaBg, color: ctaText }}>
        <ShoppingBag size={14} aria-hidden="true" />
        <span className="hidden sm:inline">Đặt hàng</span>
      </Button>
    )
  }
  if (!entry.contact) return null
  return (
    <a href={getZaloUrl(product, shop)} target="_blank" rel="noopener noreferrer" aria-label="Đặt ngay qua Zalo" className={base} style={{ backgroundColor: ctaBg, color: ctaText }}>
      <MessageCircle size={14} aria-hidden="true" />
      <span className="hidden sm:inline">Đặt ngay</span>
    </a>
  )
}
