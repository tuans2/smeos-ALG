"use client"

import React, { useEffect } from "react"
import { AlertCircle } from "@/components/ui/icons"
import { useOrderFocus, type OrderFocusBlock } from "./order-focus-context"

/** Lớp giao diện theo chuẩn Spotlight: khối đang chọn nổi bật; khối khác chỉ dịu nền/viền, chữ giữ nguyên độ tương phản (PO 29/10/2026). */
export function spotlightClasses(active: boolean): { block: string; badge: string } {
  return active
    ? {
        block: "bg-surface border-primary/50 ring-2 ring-primary/20 shadow-sm opacity-100",
        badge: "bg-primary text-white",
      }
    : {
        block: "bg-transparent border-border/60 hover:bg-surface/60",
        badge: "bg-surface-alt text-text-muted",
      }
}

export function SpotlightBlock({
  step,
  title,
  description,
  error,
  errorAttempt,
  children,
}: {
  step: OrderFocusBlock
  title: string
  description?: string | undefined
  /** Lỗi thuộc khối này: hiện ngay trong khối */
  error?: string | null | undefined
  /** Đổi mỗi lần bấm gửi bị lỗi → khối tự nhận Spotlight và cuộn tới */
  errorAttempt?: number | undefined
  children: React.ReactNode
}) {
  const { activeBlock, setActiveBlock } = useOrderFocus()
  const active = activeBlock === step
  const cls = spotlightClasses(active)
  const headingId = `order-block-${step}-title`
  useEffect(() => {
    if (!error || errorAttempt === undefined) return
    setActiveBlock(step)
    document.getElementById(headingId)?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lại khi có lần gửi lỗi mới
  }, [errorAttempt])
  const activate = () => {
    if (!active) setActiveBlock(step)
  }

  return (
    <section
      aria-labelledby={headingId}
      data-active={active ? "true" : "false"}
      data-testid={`order-block-${step}`}
      onFocusCapture={activate}
      onPointerDownCapture={activate}
      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-300 ${cls.block}`}
    >
      <header className="mb-4 flex items-start gap-3">
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-extrabold transition-all duration-300 ${cls.badge}`}
        >
          {step}
        </span>
        <div className="min-w-0">
          <h3 id={headingId} className="text-body font-extrabold text-text leading-tight">
            {title}
          </h3>
          {description && <p className="mt-0.5 text-caption text-text-muted">{description}</p>}
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-bg p-3 text-body-sm text-danger"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
