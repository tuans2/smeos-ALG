"use client"

import * as React from "react"
import { Dialog as BaseDialog } from "@base-ui/react"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"

export interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  showCloseButton = true,
}: BottomSheetProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-xs transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <BaseDialog.Popup
          className={cn(
            "fixed inset-x-0 bottom-0 z-[var(--z-overlay)] mx-auto flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[20px] border-t border-x border-border bg-surface shadow-2xl transition-transform duration-200 ease-out",
            "data-[ending-style]:translate-y-full data-[starting-style]:translate-y-full",
            className
          )}
        >
          {/* Grab Handle */}
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-border/80 flex-shrink-0" />

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3 flex-shrink-0">
              <div className="min-w-0 flex-1 pr-2">
                <BaseDialog.Title className="text-title-sm font-bold text-text truncate">
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
                  aria-label="Đóng bảng dưới"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-surface-alt hover:text-text transition-colors flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </BaseDialog.Close>
              )}
            </div>
          )}

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 text-body-sm min-h-0">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-border bg-surface px-5 py-3.5 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}
