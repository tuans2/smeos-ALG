import { TierGovernanceMatrixClient } from "@/components/governance/tier-governance-matrix-client"
import { PromotionsHubNav } from "@/components/promotions/promotions-hub-nav"

/**
 * Ưu đãi và giảm giá (công cụ Bước 3 · Quảng bá sản phẩm). Cùng component, cùng API và cùng dữ
 * liệu với Cài đặt → Ưu đãi (`/cai-dat/ma-tran-uudai`): bật/tắt ở nơi nào cũng hiện như nhau.
 */
export default function UuDaiPage() {
  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-7xl px-6 pt-6">
        <PromotionsHubNav active="uu-dai" />
      </div>
      <TierGovernanceMatrixClient
        systemKey="PROMOTIONS"
        title="Ưu đãi và giảm giá"
        description="Bật hoặc tắt các ưu đãi áp dụng cho khách khi đặt hàng qua bộ sưu tập riêng và bộ sưu tập chung. Thay đổi ở đây cũng hiện ở Cài đặt → Ưu đãi."
      />
    </div>
  )
}
