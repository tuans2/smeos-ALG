"use client"

import { useI18n } from "@/lib/i18n"
import { TierGovernanceMatrixClient } from "@/components/governance/tier-governance-matrix-client"


export default function CommitmentsPage() {
  const { t } = useI18n()
  return (
    <TierGovernanceMatrixClient
      systemKey="COMMITMENTS"
      title="Cam kết chất lượng"
      description="Quản lý các cam kết chất lượng sản phẩm (đúng tone màu, đúng mẫu, kiểm tra QC) niêm yết công khai với khách hàng."
    />
  )
}
