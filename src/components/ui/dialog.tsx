"use client"

import * as React from "react"
import { Dialog as BaseDialog } from "@base-ui/react"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Slot nằm giữa header và vùng cuộn — dùng cho thanh tab điều hướng cố định. */
  subHeader?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
  showCloseButton?: boolean
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  subHeader,
  children,
  footer,
  size = "md",
  className,
  showCloseButton = true,
}: DialogProps) {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  }

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-xs transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <div className="fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <BaseDialog.Popup
            className={cn(
              "relative flex max-h-[90dvh] w-full flex-col rounded-[var(--radius-dialog)] border border-border bg-surface shadow-[var(--shadow-dialog)] transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
              sizeClasses[size],
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sm:px-6 sm:py-4 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <BaseDialog.Title className="text-title-sm sm:text-body font-bold text-text truncate">
                  {title}
                </BaseDialog.Title>
                {description && (
                  <BaseDialog.Description className="mt-0.5 text-caption text-text-muted">
                    {description}
                  </BaseDialog.Description>
                )}
              </div>
              {showCloseButton && (
                <BaseDialog.Close
                  aria-label="Đóng hộp thoại"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-alt hover:text-text transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </BaseDialog.Close>
              )}
            </div>

            {/* Sub-header (pinned tab nav, etc.) */}
            {subHeader && (
              <div className="flex-shrink-0 border-b border-border">
                {subHeader}
              </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-body-sm min-h-0">
              {children}
            </div>

            {/* Footer (K2: 1 primary + <=2 secondary, thumb zone on mobile) */}
            {footer && (
              <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface px-5 py-3 sm:px-6 sm:py-3.5 flex-shrink-0 rounded-b-2xl">
                {footer}
              </div>
            )}
          </BaseDialog.Popup>
        </div>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
