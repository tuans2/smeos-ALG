import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

export default function CaiDatAiLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/cai-dat-ai">{children}</FeatureLockedGuard>
}
