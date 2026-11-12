import React from "react"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import type { ProductSnapshot } from "@/modules/greeting-card/domain/greeting-card-types"

/**
 * Thẻ "Mẫu đã chọn" đầu form đặt hoa. Có kích cỡ đang chọn thì hiện giá của kích cỡ đó — trước
 * 23/10/2026 luôn hiện giá gốc của mẫu nên lệch với Tạm tính (vd. 420.000 đ trong khi chọn Nhỏ 500.000 đ).
 */
export function SelectedProductHeader({
  product,
  variant,
}: {
  product: ProductSnapshot
  variant?: { name: string; priceVnd: number } | null
}) {
  const price = variant && variant.priceVnd > 0 ? variant.priceVnd : product.price
  return (
    <div className="flex items-center gap-3.5 p-3 rounded-xl bg-surface-alt border border-border mb-5">
      <FlowerImage src={product.imageUrl} driveLink={product.driveLink} alt={product.name} sizes="64px" fallback="icon" className="w-16 h-16 rounded-lg shrink-0 border border-border" />
      <div className="flex-1 min-w-0">
        <div className="text-caption text-text-muted">Mẫu đã chọn:</div>
        <div className="text-body font-extrabold text-text truncate">{product.name}</div>
        <div className="text-body-sm font-extrabold text-primary">
          {variant ? `${variant.name} · ` : ""}
          {price > 0 ? `${price.toLocaleString("vi-VN")} đ` : "Liên hệ"}
        </div>
      </div>
    </div>
  )
}
