import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface FormLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  footer?: React.ReactNode
  width?: "narrow" | "medium"
}

/**
 * Archetype D — Biểu mẫu / Cấu hình
 * Khổ hẹp (max-w-3xl hoặc max-w-4xl) giúp mắt người dùng dễ theo dõi theo chiều dọc,
 * nhãn rõ ràng, lỗi cạnh trường, thanh hành động ở đáy.
 */
export function FormLayout({
  header,
  children,
  footer,
  width = "narrow",
  className,
}: FormLayoutProps) {
  const maxWidth = width === "narrow" ? "max-w-3xl" : "max-w-4xl"

  return (
    <div className={cn("mx-auto w-full p-4 sm:p-6 space-y-6", maxWidth, className)}>
      {header && <div>{header}</div>}
      <div className="space-y-6">{children}</div>
      {footer && (
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  )
}
