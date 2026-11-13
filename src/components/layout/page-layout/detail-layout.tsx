import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface DetailLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  sidebar?: React.ReactNode
}

/**
 * Archetype C — Chi tiết / Hồ sơ
 * Khổ vừa (max-w-6xl), tên & trạng thái đối tượng ở đầu,
 * nhóm thông tin theo chủ đề nghiệp vụ kèm cột phụ metadata/hành động.
 */
export function DetailLayout({
  header,
  children,
  sidebar,
  className,
}: DetailLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl p-4 sm:p-6 space-y-6", className)}>
      {header && <div>{header}</div>}
      <div className={cn("grid gap-6", sidebar ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
        <div className={cn(sidebar ? "lg:col-span-2 space-y-6" : "space-y-6")}>{children}</div>
        {sidebar && <aside className="space-y-6">{sidebar}</aside>}
      </div>
    </div>
  )
}
