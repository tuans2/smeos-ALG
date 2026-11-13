"use client"

import { useI18n } from "@/lib/i18n"
import { TierGovernanceMatrixClient } from "@/components/governance/tier-governance-matrix-client"


export default function CraftFeesPage() {
  const { t } = useI18n()
  return (
    <TierGovernanceMatrixClient
      systemKey="CRAFT_FEES"
      title="Phí gia công & thợ"
      description="Quản lý phương án tính phí gia công, phụ cấp đơn gấp và biểu phí khoán thợ chế tác trong chuỗi."
    />
  )
}
