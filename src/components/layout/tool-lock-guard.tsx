"use client"

import { usePathname } from "next/navigation"
import { Lock } from "@/components/ui/icon-set/lock"
import { EmptyState } from "@/components/ui/empty-state"
import { useSession } from "@/lib/session"
import { lockedToolForPath } from "@/modules/organization/domain/tool-route-entitlement"

/**
 * Trang của công cụ cấp trên chưa mở khoá → báo khoá thay vì hiện màn hình (API riêng của công cụ
 * đã bị chặn ở máy chủ trong `requireTenantContext`).
 */
export function ToolLockGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { organization } = useSession()
  const unlocked = Array.isArray(organization?.unlockedTools) ? organization.unlockedTools : null
  if (pathname && lockedToolForPath(pathname, unlocked)) {
    return (
      <EmptyState
        icon={Lock}
        title="Công cụ này chưa được mở cho cửa hàng"
        reason="Cấp quản lý chuỗi chưa cấp quyền dùng công cụ này. Liên hệ quản lý chuỗi nếu bạn cần dùng."
        action={{ label: "Về thư viện công cụ", href: "/cong-cu" }}
        className="min-h-[60vh]"
      />
    )
  }
  return <>{children}</>
}
