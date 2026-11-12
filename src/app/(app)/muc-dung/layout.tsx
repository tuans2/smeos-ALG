import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

/** `/muc-dung` nằm trong `LOCKED_ROUTE_PREFIXES` — guard chặn cả khi gõ thẳng URL trên production (audit L-03, 12/11/2026). */
export default function MucDungLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/muc-dung">{children}</FeatureLockedGuard>
}
