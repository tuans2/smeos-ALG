"use client"

/**
 * NavSectionHeader — Tiêu đề nhóm điều hướng (đóng/mở được).
 * Nhãn nhỏ viết hoa, mũi tên chỉ hiện khi rê chuột/focus hoặc khi nhóm đang đóng;
 * nhóm đóng hiển thị số mục bên trong để người dùng biết còn gì phía sau.
 */

import { Button } from "@/components/ui/button"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { cn } from "@/lib/utils"
import { formatNavGroupLabel } from "./nav-group-label"

interface NavSectionHeaderProps {
  label: string
  expanded: boolean
  count?: number
  onToggle?: () => void
}

const LABEL_CLASS = "truncate text-caption font-semibold uppercase tracking-wider text-text-muted"

export function NavSectionHeader({ label, expanded, count, onToggle }: NavSectionHeaderProps) {
  const text = formatNavGroupLabel(label)

  if (!onToggle) {
    return (
      <div className="flex h-7 items-center px-2.5">
        <span className={LABEL_CLASS} title={label}>
          {text}
        </span>
      </div>
    )
  }

  return (
    <Button variant="ghost"
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      title={label}
      className={cn("justify-start font-[inherit]", 
        "group/section flex h-7 w-full select-none items-center gap-1.5 rounded-md px-2.5 text-left",
        "transition-colors duration-150 hover:bg-surface-alt",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      )}
    >
      <span className={cn(LABEL_CLASS, "flex-1 group-hover/section:text-text")}>{text}</span>
      {!expanded && typeof count === "number" && count > 0 && (
        <span className="rounded-full bg-surface-alt px-1.5 text-caption font-medium tabular-nums text-text-muted">
          {count}
        </span>
      )}
      <ChevronDown
        size={12}
        aria-hidden
        className={cn(
          "shrink-0 text-text-muted transition-[transform,opacity] duration-150",
          expanded
            ? "opacity-0 group-hover/section:opacity-100 group-focus-visible/section:opacity-100"
            : "-rotate-90 opacity-100"
        )}
      />
    </Button>
  )
}
