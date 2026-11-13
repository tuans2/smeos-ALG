"use client"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import { Button } from "@/components/ui/button"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { productPriceText } from "./product-info/product-display"
import { ProductImage } from "./aux/aux-kit"
import { ProductInfo } from "./product-info/product-info"

interface EnterpriseSpecSheetProps {
  product: GreetingCatalogProduct
  isOpen: boolean
  onClose: () => void
  onSelectProduct: (product: GreetingCatalogProduct) => void
}

/**
 * Bảng chi tiết sản phẩm (trượt từ dưới lên). Chỉ hiển thị dữ liệu có thật
 * của sản phẩm — không tự thêm kích thước, thành phần hay cam kết.
 */
export function EnterpriseSpecSheet({ product, isOpen, onClose, onSelectProduct }: EnterpriseSpecSheetProps) {
  return (
    <BottomSheet
      open={isOpen}
      onOpenChange={(o) => { if (!o) onClose() }}
      title={product.name}
      className="max-w-[480px] bg-surface text-text"
      footer={
        <Button
          type="button"
          onClick={() => onSelectProduct(product)}
          className="h-12 w-full justify-between rounded-2xl px-5 text-body font-bold shadow-md"
        >
          <span>Đặt mẫu này</span>
          <span className="tabular-nums">{productPriceText(product)}</span>
        </Button>
      }
    >
      <div className="-m-5 flex flex-col">
        <div className="relative aspect-[4/3] w-full shrink-0 bg-surface-alt">
          <ProductImage product={product} />
        </div>
        <div className="px-5 pb-4 pt-5">
          <ProductInfo
            product={product}
            level="full"
            size="lg"
            as="h3"
            id="spec-title"
            muted="var(--color-text-muted)"
            titleClassName="font-serif text-display font-medium tracking-tight"
          />
        </div>
      </div>
    </BottomSheet>
  )
}
