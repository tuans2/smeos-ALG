import type { ReactNode } from "react"
import { FeatureLockedGuard } from "@/components/layout/feature-locked-guard"

export default function KhachHangLayout({ children }: { children: ReactNode }) {
  return <FeatureLockedGuard route="/khach-hang">{children}</FeatureLockedGuard>
}
