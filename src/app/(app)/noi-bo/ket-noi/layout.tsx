import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

/** `/noi-bo/ket-noi` nằm trong `LOCKED_ROUTE_PREFIXES` — guard chặn cả khi gõ thẳng URL trên production (audit L-03, 12/11/2026). */
export default function NoiBoKetNoiLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/noi-bo/ket-noi">{children}</FeatureLockedGuard>
}
