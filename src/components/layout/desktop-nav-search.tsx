"use client"

/**
 * DesktopNavSearch — Ô tìm chức năng trong sidebar (phím tắt `/`).
 */

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { KeyboardEvent, RefObject } from "react"
import { Search } from "@/components/ui/icon-set/search"
import { X } from "@/components/ui/icon-set/x"
import { cn } from "@/lib/utils"

interface DesktopNavSearchProps {
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
}

export function DesktopNavSearch({ inputRef, value, onChange, onKeyDown }: DesktopNavSearchProps) {
  return (
    <div className="px-3 pt-3 pb-1">
      <div className="relative flex items-center">
        <Search size={15} className="pointer-events-none absolute left-2.5 text-text-muted" aria-hidden />
        <Input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Tìm chức năng…"
          aria-label="Tìm kiếm chức năng"
          className={cn(
            "h-9 w-full rounded-lg border border-border bg-surface-alt pl-8 pr-9 text-body-sm text-text shadow-xs",
            "placeholder:text-text-muted transition-[border-color,box-shadow,background-color] duration-150",
            "hover:border-primary-border focus:border-primary-border focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20",
            "[&::-webkit-search-cancel-button]:hidden"
          )}
        />
        {value ? (
          <Button variant="ghost"
            type="button"
            onClick={() => onChange("")}
            className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 absolute right-2 flex h-6 w-6 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-alt hover:text-text"
            aria-label="Xóa tìm kiếm"
          >
            <X size={13} />
          </Button>
        ) : (
          <kbd className="pointer-events-none absolute right-2 rounded border border-border bg-surface px-1.5 py-px font-mono text-caption leading-tight text-text-muted">
            /
          </kbd>
        )}
      </div>
    </div>
  )
}
