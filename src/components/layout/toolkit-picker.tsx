"use client"

/**
 * toolkit-picker.tsx — Dropdown chọn công cụ để pin vào shortcuts (SRP)
 */

import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { X } from "@/components/ui/icon-set/x"
import { PinOff } from "@/components/ui/icon-set/pin-off"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NAV_ICONS as ICONS } from "./nav-icons"
import type { NavEntry } from "./nav-model"

export interface ToolkitPickerProps {
  entries: NavEntry[]
  pinnedKeys: string[]
  isCustomized: boolean
  onPin: (navKey: string) => void
  onReset: () => void
  onClose: () => void
}

export function ToolkitPicker({
  entries,
  isCustomized,
  onPin,
  onReset,
  onClose,
}: ToolkitPickerProps) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-border",
        "bg-surface shadow-lg shadow-black/10 backdrop-blur-sm",
        "animate-in fade-in slide-in-from-top-2 duration-150"
      )}
      role="dialog"
      aria-label="Chọn công cụ để ghim"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-meta font-semibold text-text">Chọn lối tắt</span>
        <div className="flex items-center gap-1">
          {isCustomized && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="flex h-6 items-center gap-1 rounded-md px-2 py-0.5 text-caption text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
            >
              <RotateCcw size={10} />
              Mặc định
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Đóng"
            onClick={onClose}
            className="h-6 w-6 rounded-md p-0.5 text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
          >
            <X size={13} />
          </Button>
        </div>
      </div>

      {/* Danh sách công cụ chưa pin */}
      <div className="max-h-56 overflow-y-auto py-1">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-center text-meta text-text-muted">
            Đã ghim tất cả công cụ khả dụng
          </p>
        ) : (
          entries.map((entry) => {
            const Icon = ICONS[entry.iconKey]
            return (
              <Button variant="ghost"
                type="button"
                key={entry.navKey}
                onClick={() => {
                  onPin(entry.navKey)
                  onClose()
                }}
                className={cn("h-auto", "justify-start font-[inherit]", 
                  "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-meta text-left",
                  "hover:bg-surface-alt transition-colors duration-100"
                )}
              >
                {Icon && (
                  <Icon size={14} className="shrink-0 text-text-muted" aria-hidden />
                )}
                <span className="flex-1 truncate text-text">{entry.label}</span>
                <PinOff size={11} className="shrink-0 text-text-muted/60" aria-hidden />
              </Button>
            )
          })
        )}
      </div>
    </div>
  )
}
