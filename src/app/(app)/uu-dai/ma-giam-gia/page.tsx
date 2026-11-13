import { PromotionsHubNav } from "@/components/promotions/promotions-hub-nav"
import { VoucherBatchesClient } from "@/components/promotions/voucher-batches-client"

/** Phát hành mã giảm giá (Bước 3 · Quảng bá sản phẩm). */
export default function MaGiamGiaPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 p-4 sm:p-6">
      <PromotionsHubNav active="ma-giam-gia" />
      <VoucherBatchesClient />
    </div>
  )
}
