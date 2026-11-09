"use client"

import { BottomSheet } from "@/components/ui/bottom-sheet"
import React from "react"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"
import type { GreetingCatalogProduct } from "@/modules/greeting-card/domain/greeting-card-types"
import { ProductContactActions } from "./product-contact-actions"

interface Props {
  product: GreetingCatalogProduct
  shop: ShopContact
  inquiryUrl: string
  /** Mẫu "Liên hệ" (giá theo yêu cầu); false = khách hỏi tư vấn chung / cửa hàng tắt đặt online */
  priceOnRequest?: boolean | undefined
  onClose: () => void
}

/** Khung liên hệ ở Bộ sưu tập riêng: mẫu "Liên hệ", khách bấm "Nhắn tin", hoặc cửa hàng tắt đặt online. */
export function ContactProductSheet({ product, shop, inquiryUrl, priceOnRequest = true, onClose }: Props) {
  return (
    <BottomSheet open onOpenChange={(o) => { if (!o) onClose() }}
      title={product.name}>
      <div className="flex flex-col">
        <p className="mb-3 text-body-sm text-text-muted">
          {priceOnRequest
            ? "Mẫu này cửa hàng tư vấn giá trực tiếp. Bạn gọi điện, nhắn Zalo hoặc để lại tin nhắn nhé."
            : "Cửa hàng sẽ tư vấn mẫu này cho bạn. Bạn gọi điện, nhắn Zalo hoặc để lại tin nhắn nhé."}
        </p>
        <ProductContactActions shop={shop} inquiryUrl={inquiryUrl} product={product} />
      </div>
    </BottomSheet>
  )
}
