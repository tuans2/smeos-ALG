import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface SettingsLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  nav?: React.ReactNode
}

/**
 * Archetype F — Cài đặt / Kết nối
 * Khổ vừa (max-w-5xl), nhóm cấu hình rõ ràng, hỗ trợ thanh tab/menu cài đặt bên lề hoặc bên trên.
 */
export function SettingsLayout({
  header,
  nav,
  children,
  className,
}: SettingsLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-5xl p-4 sm:p-6 space-y-6", className)}>
      {header && <div>{header}</div>}
      <div className={cn("grid gap-6", nav ? "grid-cols-1 md:grid-cols-12" : "grid-cols-1")}>
        {nav && <nav aria-label="Menu cài đặt" className="md:col-span-3 space-y-1">{nav}</nav>}
        <div className={cn(nav ? "md:col-span-9 space-y-6" : "space-y-6")}>{children}</div>
      </div>
    </div>
  )
}
