import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

export default function CatalogLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/catalog">{children}</FeatureLockedGuard>
}
