"use client"

import React, { useState } from "react"
import { Smartphone, Monitor, ExternalLink, RefreshCw } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

interface BrochurePreviewModalProps {
  url: string
  title?: string
  onClose: () => void
}

export function BrochurePreviewModal({
  url,
  title = "Xem trước bộ sưu tập",
  onClose,
}: BrochurePreviewModalProps) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile")
  const [iframeKey, setIframeKey] = useState(0)

  return (
    <Dialog
      open
      onOpenChange={(o) => { if (!o) onClose() }}
      size="lg"
      className="max-w-4xl h-[90dvh]"
      title={title}
      description="Xem trực tiếp"
      subHeader={
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-2 sm:px-6">
          <div role="group" aria-label="Khổ xem trước" className="flex items-center gap-0.5 rounded-xl border border-border bg-surface p-0.5">
            <Button
              type="button"
              variant={device === "mobile" ? "primary" : "ghost"}
              size="xs"
              aria-pressed={device === "mobile"}
              onClick={() => setDevice("mobile")}
              className="gap-1"
              title="Khổ điện thoại (390px)"
            >
              <Smartphone size={15} />
              <span className="hidden sm:inline">Di động</span>
            </Button>
            <Button
              type="button"
              variant={device === "desktop" ? "primary" : "ghost"}
              size="xs"
              aria-pressed={device === "desktop"}
              onClick={() => setDevice("desktop")}
              className="gap-1"
              title="Toàn màn hình"
            >
              <Monitor size={15} />
              <span className="hidden sm:inline">Máy tính</span>
            </Button>
          </div>
          <Button type="button" variant="outline" size="icon-sm" onClick={() => setIframeKey((k) => k + 1)} aria-label="Tải lại bản xem trước" title="Tải lại bản xem trước">
            <RefreshCw size={14} />
          </Button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label="Mở trong tab mới"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] border border-border bg-surface text-text-muted hover:bg-surface-alt hover:text-text"
            title="Mở trong tab mới"
          >
            <ExternalLink size={15} />
          </a>
        </div>
      }
    >
        <div className="-m-5 sm:-m-6 h-[calc(100%+2.5rem)] sm:h-[calc(100%+3rem)] bg-surface-muted flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
          <div
            className={`transition-all duration-300 h-full flex flex-col bg-bg rounded-2xl overflow-hidden shadow-xl border border-border ${
              device === "mobile"
                ? "w-[390px] max-w-full ring-8 ring-black/10 rounded-[36px]"
                : "w-full"
            }`}
          >
            {/* Phone Notch mockup if mobile */}
            {device === "mobile" && (
              <div className="h-5 bg-foreground/10 shrink-0 flex items-center justify-center">
                <div className="w-24 h-3.5 bg-foreground/20 rounded-full mt-1" />
              </div>
            )}
            <iframe
              key={iframeKey}
              src={url}
              title="Xem trước trang khách"
              className="w-full flex-1 border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
    </Dialog>
  )
}
