import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface ListLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  filters?: React.ReactNode
  bulkActions?: React.ReactNode
  pagination?: React.ReactNode
}

/**
 * Archetype B — Danh sách / Tìm kiếm
 * Khổ rộng (max-w-7xl), tìm kiếm và lọc sát danh sách (UX-P09),
 * hỗ trợ thanh hành động hàng loạt khi chọn (UX-P10) và phân trang ở đáy.
 */
export function ListLayout({
  header,
  filters,
  bulkActions,
  children,
  pagination,
  className,
}: ListLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4", className)}>
      {header && <div>{header}</div>}
      {filters && <div>{filters}</div>}
      {bulkActions && <div>{bulkActions}</div>}
      <div className="space-y-4">{children}</div>
      {pagination && <div className="pt-2">{pagination}</div>}
    </div>
  )
}
