"use client"

import * as React from "react"
import { useAnnounce } from "@/components/ui/live-region"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Info } from "@/components/ui/icon-set/info"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"

export type ToastTone = "success" | "error" | "info" | "warning"

export interface ToastOptions {
  id?: string | undefined
  title?: string | undefined
  message: string
  tone?: ToastTone | undefined
  durationMs?: number | undefined
  action?: {
    label: string
    onClick: () => void
  } | undefined
}

export interface ToastItem extends ToastOptions {
  id: string
}

export interface ToastContextValue {
  show: (options: ToastOptions | string) => string
  success: (message: string, title?: string) => string
  error: (message: string, title?: string) => string
  info: (message: string, title?: string) => string
  warning: (message: string, title?: string) => string
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const { announce } = useAnnounce()

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = React.useCallback(
    (options: ToastOptions | string) => {
      const opts: ToastOptions =
        typeof options === "string" ? { message: options } : options
      const id = opts.id || Math.random().toString(36).slice(2, 9)
      const tone = opts.tone || "info"
      const duration = opts.durationMs ?? (tone === "error" ? 6000 : 4000)

      // Announce via LiveRegion for screen readers
      const textToAnnounce = opts.title ? `${opts.title}: ${opts.message}` : opts.message
      announce(textToAnnounce, tone === "error" ? "assertive" : "polite")

      const item: ToastItem = { ...opts, id, tone }
      setToasts((prev) => [...prev.slice(-4), item])

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id)
        }, duration)
      }

      return id
    },
    [announce, dismiss]
  )

  const success = React.useCallback(
    (message: string, title?: string) => show({ message, title: title ?? undefined, tone: "success" }),
    [show]
  )
  const error = React.useCallback(
    (message: string, title?: string) => show({ message, title: title ?? undefined, tone: "error" }),
    [show]
  )
  const info = React.useCallback(
    (message: string, title?: string) => show({ message, title: title ?? undefined, tone: "info" }),
    [show]
  )
  const warning = React.useCallback(
    (message: string, title?: string) => show({ message, title: title ?? undefined, tone: "warning" }),
    [show]
  )

  const toneIcons = {
    success: <CheckCircle2 className="h-5 w-5 text-success shrink-0" />,
    error: <XCircle className="h-5 w-5 text-danger shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 text-warning shrink-0" />,
    info: <Info className="h-5 w-5 text-primary shrink-0" />,
  }

  return (
    <ToastContext.Provider value={{ show, success, error, info, warning, dismiss }}>
      {children}
      {/* Toast Viewport at top-right / top-center on mobile */}
      <div
        role="region"
        aria-label="Thông báo nổi"
        className="fixed inset-x-4 top-4 z-[var(--z-toast)] flex flex-col gap-2 pointer-events-none sm:inset-x-auto sm:right-4 sm:w-full sm:max-w-sm"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl transition-all",
              "animate-in fade-in-50 slide-in-from-top-2"
            )}
          >
            {toneIcons[toast.tone || "info"]}
            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-body-sm font-semibold text-text truncate">
                  {toast.title}
                </h4>
              )}
              <p className="text-body-sm text-text leading-snug">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  onClick={() => {
                    toast.action?.onClick()
                    dismiss(toast.id)
                  }}
                  className="mt-2 text-caption font-semibold text-primary hover:underline focus-visible:outline-none"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={() => dismiss(toast.id)}
              className="text-text-muted hover:text-text rounded-md p-1 -mr-1 -mt-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  if (!context) {
    return {
      show: () => "",
      success: () => "",
      error: () => "",
      info: () => "",
      warning: () => "",
      dismiss: () => {},
    }
  }
  return context
}
