"use client"

import { SubstitutePanel, type SubstituteData } from "./substitute-panel"
import { FlowerSubstitutePanel, type FlowerSubstituteData } from "./flower-substitute-panel"

export type { SubstituteData, FlowerSubstituteData }

type Proof = { sendCode?: string | null | undefined; last4?: string | null | undefined }

/** Các đề xuất của tiệm trên trang theo dõi: đổi cả mẫu, đổi một loại hoa phụ (ALG 5.14). */
export function OrderProposalsPanel({ orderCode, proof, substitute, flower, onChanged }: {
  orderCode: string
  proof: Proof
  substitute: SubstituteData | null
  flower: FlowerSubstituteData | null
  onChanged: () => void
}) {
  return (
    <>
      {substitute && <SubstitutePanel orderCode={orderCode} proof={proof} substitute={substitute} onChanged={onChanged} />}
      {flower && <FlowerSubstitutePanel orderCode={orderCode} proof={proof} flower={flower} onChanged={onChanged} />}
    </>
  )
}
