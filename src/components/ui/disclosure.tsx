"use client"

import * as React from "react"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { cn } from "@/lib/utils"

export interface DisclosureProps {
  /** Nhãn nói rõ bên trong có gì: "Tùy chỉnh phong cách và tỷ lệ" — không dùng "Khác". */
  label: string
  /** Tóm tắt khi đang đóng mà có giá trị khác mặc định: "Đã tùy chỉnh 2 mục". */
  appliedSummary?: string | undefined
  defaultOpen?: boolean | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  children: React.ReactNode
  className?: string | undefined
}

/**
 * Vùng "Tùy chỉnh thêm" (03c UX-017, UX-P03).
 * Nội dung luôn được giữ trong DOM khi đóng (`hidden`), nên giá trị đã nhập không mất.
 */
export function Disclosure({
  label,
  appliedSummary,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  children,
  className,
}: DisclosureProps) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = openProp ?? openState
  const panelId = React.useId()

  function toggle() {
    const next = !open
    if (openProp === undefined) setOpenState(next)
    onOpenChange?.(next)
  }

  return (
    <div className={cn("rounded-xl border border-border bg-surface", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-body font-semibold text-text hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="min-w-0">
          {label}
          {!open && appliedSummary && (
            <span className="ml-2 text-body-sm font-normal text-text-muted">· {appliedSummary}</span>
          )}
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div id={panelId} hidden={!open} className="border-t border-border px-3.5 py-3">
        {children}
      </div>
    </div>
  )
}
