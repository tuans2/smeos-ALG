"use client"

/**
 * NavSubTree — Mục cha đóng/mở được, chứa danh sách mục con thụt lề có đường dẫn cây.
 * Dùng cho "Báo cáo" (nhóm Việc hôm nay) và "Ma trận quản trị" (nhóm thiết lập).
 */

import { Button } from "@/components/ui/button"
import type { ComponentType } from "react"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { cn } from "@/lib/utils"
import type { NavEntry } from "./nav-model"
import { DesktopNavItem } from "./desktop-nav-item"
import { NAV_ICONS as ICONS } from "./nav-icons"
import { isEntryActive } from "./nav-group-layout"

interface NavSubTreeProps {
  label: string
  icon: ComponentType<{ size?: number; className?: string; weight?: "regular" | "fill" | "duotone" }>
  entries: NavEntry[]
  open: boolean
  pathname: string
  /** Thêm điều kiện "đang chọn" ngoài các mục con (vd: /so-lieu cho Báo cáo) */
  extraActive?: boolean
  childLabel?: (label: string) => string
  onToggle: () => void
  onNavigate: (href: string) => void
}

export function NavSubTree({
  label,
  icon: Icon,
  entries,
  open,
  pathname,
  extraActive = false,
  childLabel,
  onToggle,
  onNavigate,
}: NavSubTreeProps) {
  const containsActive = extraActive || entries.some((e) => isEntryActive(e, pathname))
  const highlight = containsActive && !open

  return (
    <>
      <Button variant="ghost"
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={cn("justify-start", 
          "group relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-body-sm font-medium",
          "transition-colors duration-150 pointer-coarse:h-11",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
          highlight
            ? "bg-primary-muted font-semibold text-primary hover:bg-primary-muted"
            : "text-text-muted hover:bg-surface-alt hover:text-text"
        )}
      >
        <Icon
          size={18}
          weight={containsActive ? "fill" : "regular"}
          aria-hidden
          className={cn("shrink-0", containsActive ? "text-primary" : "text-text-muted group-hover:text-text")}
        />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {!open && (
          <span className="rounded-full bg-surface-alt px-1.5 text-caption font-medium tabular-nums text-text-muted">
            {entries.length}
          </span>
        )}
        <ChevronDown
          size={14}
          aria-hidden
          className={cn(
            "shrink-0 text-text-muted transition-transform duration-150 group-hover:text-text",
            !open && "-rotate-90"
          )}
        />
      </Button>

      {open && (
        <div className="ml-5 flex flex-col gap-px border-l border-border pl-2">
          {entries.map((item) => (
            <DesktopNavItem
              key={item.href}
              item={childLabel ? { ...item, label: childLabel(item.label) } : item}
              active={isEntryActive(item, pathname)}
              isSubItem
              iconComponent={ICONS[item.iconKey]}
              onClick={() => onNavigate(item.href)}
            />
          ))}
        </div>
      )}
    </>
  )
}
