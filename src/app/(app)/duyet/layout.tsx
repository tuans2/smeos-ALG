import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

/** `/duyet` nằm trong `LOCKED_ROUTE_PREFIXES` — guard chặn cả khi gõ thẳng URL trên production (audit L-03, 12/11/2026). */
export default function DuyetLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/duyet">{children}</FeatureLockedGuard>
}
