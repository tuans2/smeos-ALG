import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

/** `/tin-nhan` nằm trong `LOCKED_ROUTE_PREFIXES` (PO 25/10/2026) — trước đây thiếu guard nên production vào thẳng URL được. */
export default function InternalChatLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/tin-nhan">{children}</FeatureLockedGuard>
}
