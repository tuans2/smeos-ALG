import * as React from "react"
import { cn } from "@/lib/utils"
import type { BasePageLayoutProps } from "./types"

export interface BuilderLayoutProps extends BasePageLayoutProps {
  header?: React.ReactNode
  controls: React.ReactNode
  preview: React.ReactNode
  footer?: React.ReactNode
}

/**
 * Archetype E — Tạo nội dung / Builder
 * Khổ rộng (max-w-7xl), bố cục 2 cột (bảng điều khiển cấu hình bên trái / xem trước trực tiếp bên phải),
 * tự động xếp chồng trên màn hình hẹp (< lg).
 */
export function BuilderLayout({
  header,
  controls,
  preview,
  footer,
  children,
  className,
}: BuilderLayoutProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl p-4 sm:p-6 space-y-4", className)}>
      {header && <div>{header}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section aria-label="Bảng điều khiển" className="lg:col-span-5 xl:col-span-4 space-y-4">
          {controls}
          {children}
        </section>
        <section aria-label="Khu vực xem trước" className="lg:col-span-7 xl:col-span-8 space-y-4 lg:sticky lg:top-4">
          {preview}
        </section>
      </div>
      {footer && (
        <div className="pt-4 border-t border-border flex flex-wrap items-center justify-end gap-3">
          {footer}
        </div>
      )}
    </div>
  )
}
