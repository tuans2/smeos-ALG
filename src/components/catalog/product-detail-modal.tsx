"use client"

import { Button } from "@/components/ui/button"
import React, { useState } from "react"
import {
  Phone,
  MessageCircle,
  Tag,
  Layers,
  Flower2,
} from "@/components/ui/icons"
import { Dialog } from "@/components/ui/dialog"
import type { PublicCatalogProduct, PublicCatalogShop } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { SmartFlowerImage } from "./smart-flower-image"
import { formatCurrency } from "@/lib/i18n/formatters"
import { PublicOrderForm } from "./public-order-form"

interface ProductDetailModalProps {
  product: PublicCatalogProduct
  shop: PublicCatalogShop
  customer?: { name?: string | undefined; phone?: string | undefined } | undefined
  /** Slug catalog khi Điều hành bật nút Đặt hàng cho trang này (Đơn hàng đa nguồn §3.2). */
  orderSlug?: string | undefined
  /** Mở thẳng form đặt hàng (khách bấm "Đặt hàng" trên thẻ sản phẩm) */
  startOrdering?: boolean | undefined
  /** Điều hành tắt "Liên hệ" cho nguồn này → ẩn Gọi / Nhắn Zalo */
  contactEnabled?: boolean | undefined
  onClose: () => void
}

function formatVnd(amount: number | null) {
  if (!amount) return "Liên hệ báo giá"
  return formatCurrency(amount)
}

function getZaloUrl(
  product: PublicCatalogProduct,
  shop: PublicCatalogShop,
  customer?: { name?: string | undefined; phone?: string | undefined } | undefined
) {
  const phone = shop.phone ? shop.phone.replace(/[^0-9]/g, "") : ""
  const priceText = product.price ? formatVnd(product.price) : "chưa có giá"
  const senderText = customer?.name ? `Tôi là ${customer.name}` : "Tôi"
  const text = encodeURIComponent(
    `Chào ${shop.name}, ${senderText} muốn tư vấn & đặt sản phẩm: ${product.name} (Mã: ${product.code}, Giá: ${priceText}).`
  )
  return phone ? `https://zalo.me/${phone}?text=${text}` : `https://zalo.me/?text=${text}`
}

export { formatVnd, getZaloUrl }

export function ProductDetailModal({ product, shop, customer, orderSlug, startOrdering = false, contactEnabled = true, onClose }: ProductDetailModalProps) {
  const [ordering, setOrdering] = useState(startOrdering && !!orderSlug)
  return (
    <Dialog
      open={true}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={product.name}
      description={`Mã sản phẩm: ${product.code}`}
      size="md"
      footer={
        <div className="flex w-full items-center gap-2.5">
          {contactEnabled && shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-caption font-bold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Phone size={15} /> Gọi Hotline
            </a>
          )}
          {orderSlug && !ordering && (
            <Button variant="primary" type="button" onClick={() => setOrdering(true)} className="gap-0 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 py-2 text-body-sm font-extrabold text-white hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-primary">
              Đặt hàng
            </Button>
          )}
          {contactEnabled && (
          <a
            href={getZaloUrl(product, shop, customer)}
            target="_blank"
            rel="noopener noreferrer"
            className={orderSlug
              ? "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-body-sm font-bold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-primary"
              : "flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-body-sm font-extrabold text-white shadow-xs hover:bg-primary-dark transition-colors focus-visible:outline-2 focus-visible:outline-primary"}
          >
            <MessageCircle size={18} /> {orderSlug ? "Nhắn Zalo" : "Nhắn tin Zalo đặt mẫu này"}
          </a>
          )}
        </div>
      }
    >
      {ordering && orderSlug ? (
        <PublicOrderForm slug={orderSlug} productId={product.id} productName={product.name} onBack={() => setOrdering(false)} />
      ) : (
      <div className="flex flex-col gap-4">
        {/* Product Image */}
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-surface-alt shrink-0">
          <SmartFlowerImage
            src={product.imageUrl}
            alt={product.name}
            aspectRatio="4/3"
            className="rounded-xl"
          />
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-2">
          <span className="text-display font-black text-primary">{formatVnd(product.price)}</span>
        </div>

        {product.description && (
          <p className="rounded-xl border border-border bg-surface-alt p-3.5 text-body-sm text-text-muted leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Attributes */}
        <div className="grid grid-cols-2 gap-2.5 text-caption">
          {product.category && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Tag size={15} className="text-primary" />
              <div>
                <div className="text-caption text-text-muted">Danh mục</div>
                <div className="font-bold text-text">{product.category}</div>
              </div>
            </div>
          )}
          {product.stemCount && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <Layers size={15} className="text-primary" />
              <div>
                <div className="text-caption text-text-muted">Định lượng</div>
                <div className="font-bold text-text">{product.stemCount} cành</div>
              </div>
            </div>
          )}
        </div>

      </div>
      )}
    </Dialog>
  )
}
