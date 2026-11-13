import { PromotionsHubNav } from "@/components/promotions/promotions-hub-nav"
import { PriceListsClient } from "@/components/promotions/price-lists-client"

/** Bảng giá sản phẩm (Bước 3 · Quảng bá sản phẩm). */
export default function BangGiaPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <PromotionsHubNav active="bang-gia" />
      <PriceListsClient />
    </div>
  )
}
