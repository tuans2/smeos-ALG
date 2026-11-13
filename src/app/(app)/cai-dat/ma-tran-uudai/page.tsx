"use client"

import { useI18n } from "@/lib/i18n"
import { TierGovernanceMatrixClient } from "@/components/governance/tier-governance-matrix-client"


export default function PromotionsPage() {
  const { t } = useI18n()
  return (
    <TierGovernanceMatrixClient
      systemKey="PROMOTIONS"
      title="Ưu đãi & khuyến mãi"
      description="Quản lý và kích hoạt các ưu đãi, voucher giảm giá áp dụng cho khách hàng khi đặt mua qua bộ sưu tập riêng và bộ sưu tập chung."
    />
  )
}
