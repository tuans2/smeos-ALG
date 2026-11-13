"use client"

import { useI18n } from "@/lib/i18n"
import { MotherGovernanceMatrixClient } from "@/components/governance/mother-governance-matrix-client"


export default function MotherGovernanceMatrixPage() {
  const { t } = useI18n()
  return <MotherGovernanceMatrixClient />
}
