"use client"

/**
 * DesktopNavItem — Mục điều hướng đơn trong Sidebar
 *
 * Hỗ trợ 2 chế độ:
 *  - Mở rộng (collapsed=false): icon + nhãn đầy đủ, cao 36px (44px trên màn cảm ứng)
 *  - Thu gọn (collapsed=true): ô icon vuông 40px + tooltip khi hover/focus
 *
 * Trạng thái đang chọn: nền thương hiệu nhạt + chữ thương hiệu + vạch nhấn trái,
 * tách biệt rõ với trạng thái hover (nền phụ trung tính).
 * Sắp ra mắt: nhãn "Sắp ra mắt" + không bấm được.
 */

import { Button } from "@/components/ui/button"
import { useState, type ComponentType, type ReactNode } from "react"
import { Tag } from "@/components/ui/icon-set/tag"
import { cn } from "@/lib/utils"
import { COMING_SOON_LABEL, isRouteLocked } from "@/lib/feature-lock"
import type { NavEntry } from "./nav-model"

type NavIcon = ComponentType<{
  size?: number
  className?: string
  strokeWidth?: number
  weight?: "regular" | "fill" | "duotone"
}>

interface DesktopNavItemProps {
  item: NavEntry
  active: boolean
  isSubItem?: boolean
  collapsed?: boolean
  iconComponent?: NavIcon | undefined
  /** Phần tử phụ bên phải (vd: phím tắt, số đếm) */
  trailing?: ReactNode
  onClick: () => void
}

// ────────────────────────────────────────────────────────────────
// Shared layout classes
// ────────────────────────────────────────────────────────────────
function itemBaseClass(isSubItem: boolean, collapsed: boolean) {
  return cn(
    "group relative flex w-full items-center rounded-lg text-left font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset",
    collapsed
      ? "h-10 justify-center px-0"
      : isSubItem
        ? "h-8 justify-start gap-2.5 px-2.5 text-body-sm pointer-coarse:h-11"
        : "h-9 justify-start gap-2.5 px-2.5 text-body-sm pointer-coarse:h-11"
  )
}

function iconSize(collapsed: boolean, isSubItem: boolean) {
  if (collapsed) return 20
  return isSubItem ? 16 : 18
}

// ────────────────────────────────────────────────────────────────
// Tooltip — chỉ hiện khi thu gọn
// ────────────────────────────────────────────────────────────────
function NavTooltip({
  label,
  collapsed,
  children,
}: {
  label: string
  collapsed: boolean
  children: ReactNode
}) {
  // Vị trí cố định theo viewport: vùng cuộn của sidebar có overflow-hidden nên tooltip
  // định vị tuyệt đối sẽ bị cắt mất.
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)

  if (!collapsed) return <>{children}</>

  const show = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect()
    setAnchor({ top: rect.top + rect.height / 2, left: rect.right + 12 })
  }

  return (
    <div
      className="relative flex w-full justify-center"
      onMouseEnter={(e) => show(e.currentTarget)}
      onMouseLeave={() => setAnchor(null)}
      onFocus={(e) => show(e.currentTarget)}
      onBlur={() => setAnchor(null)}
    >
      {children}
      {anchor && (
        <div
          role="tooltip"
          style={{ top: anchor.top, left: anchor.left }}
          className={cn(
            "pointer-events-none fixed z-50 -translate-y-1/2 whitespace-nowrap rounded-md",
            "bg-text px-2.5 py-1.5 text-meta font-medium text-surface shadow-lg"
          )}
        >
          {label}
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Sắp ra mắt (không bấm được)
// ────────────────────────────────────────────────────────────────
function NavItemDisabled({
  item,
  isSubItem,
  collapsed,
  Icon,
}: {
  item: NavEntry
  isSubItem: boolean
  collapsed: boolean
  Icon: NavIcon
}) {
  return (
    <NavTooltip label={`${item.label} · ${COMING_SOON_LABEL}`} collapsed={collapsed}>
      <div
        aria-disabled="true"
        title={collapsed ? undefined : COMING_SOON_LABEL}
        className={cn(itemBaseClass(isSubItem, collapsed), "cursor-not-allowed text-text-muted")}
      >
        <Icon size={iconSize(collapsed, isSubItem)} className="shrink-0 text-border" aria-hidden />
        {!collapsed && (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            <span className="shrink-0 rounded-md border border-border px-1.5 py-px text-caption font-medium text-text-muted">
              {COMING_SOON_LABEL}
            </span>
          </>
        )}
      </div>
    </NavTooltip>
  )
}

// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────
export function DesktopNavItem({
  item,
  active,
  isSubItem = false,
  collapsed = false,
  iconComponent,
  trailing,
  onClick,
}: DesktopNavItemProps) {
  const Icon = iconComponent || Tag

  if (item.status === "COMING_SOON" || isRouteLocked(item.href)) {
    return <NavItemDisabled item={item} isSubItem={isSubItem} collapsed={collapsed} Icon={Icon} />
  }

  return (
    <NavTooltip label={item.label} collapsed={collapsed}>
      <Button variant="ghost"
        type="button"
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? undefined : item.hint ? `${item.label}: ${item.hint}` : item.label}
        className={cn("h-auto", 
          "cursor-pointer",
          itemBaseClass(isSubItem, collapsed),
          active
            ? "bg-primary-muted font-semibold text-primary hover:bg-primary-muted"
            : "text-text-muted hover:bg-surface-alt hover:text-text"
        )}>
        {active && !collapsed && !isSubItem && (
          <span className="absolute -left-3 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary" aria-hidden />
        )}

        <Icon
          size={iconSize(collapsed, isSubItem)}
          weight={active ? "fill" : "regular"}
          aria-hidden
          className={cn(
            "shrink-0 transition-colors duration-150",
            active ? "text-primary" : "text-text-muted group-hover:text-text"
          )}
        />

        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
        {!collapsed && trailing}
      </Button>
    </NavTooltip>
  )
}
