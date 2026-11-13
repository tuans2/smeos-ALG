import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

export default function GiaLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/gia">{children}</FeatureLockedGuard>
}
