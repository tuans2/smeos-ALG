import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface DashboardLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  kpis?: React.ReactNode
  sidebar?: React.ReactNode
}

/**
 * Archetype A — Dashboard / Tổng quan
 * Khổ rộng (max-w-7xl), ưu tiên hiển thị trạng thái và chỉ số cần hành động trước.
 */
export function DashboardLayout({
  header,
  kpis,
  children,
  sidebar,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-6", className)}>
      {header && <div>{header}</div>}
      {kpis && <section aria-label="Chỉ số hoạt động">{kpis}</section>}
      <div className={cn("grid gap-6", sidebar ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        <div className={cn(sidebar ? "lg:col-span-2 space-y-6" : "space-y-6")}>{children}</div>
        {sidebar && <aside className="space-y-6">{sidebar}</aside>}
      </div>
    </div>
  )
}
