"use client"

/**
 * DesktopNavHeader — Thẻ không gian làm việc ở đầu sidebar.
 * Logo mang màu nhận diện của tầng (Mother / SaaS Ngành / ChainOS / StoreOS),
 * tên tổ chức ở dòng chính, nhãn tầng ở dòng phụ, dải nhấn mảnh trên cùng.
 */

import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { PanelLeftClose } from "@/components/ui/icon-set/panel-left-close"
import { PanelLeftOpen } from "@/components/ui/icon-set/panel-left-open"
import { X } from "@/components/ui/icon-set/x"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ArchitectureNametag } from "./architecture-nametag"
import { NAV_TIER_THEME, resolveNavTier } from "./nav-tier-theme"

interface DesktopNavHeaderProps {
  collapsed: boolean
  onToggleCollapse: () => void
  drawer?: boolean
  onClose?: (() => void) | undefined
  isDev?: boolean
}

const ICON_BUTTON =
  "relative flex shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors duration-150 " +
  "hover:bg-surface-alt hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"

export function DesktopNavHeader({
  collapsed,
  onToggleCollapse,
  drawer = false,
  onClose,
  isDev = false,
}: DesktopNavHeaderProps) {
  const { orgName, organizationType, roleKey } = useSession()
  const { t } = useI18n()

  const theme = NAV_TIER_THEME[resolveNavTier(organizationType, roleKey)]
  const displayName = (orgName || "Doanh nghiệp").replace(/\s*\(\s*dev\s*\)/gi, "").trim()

  return (
    <div
      className={cn(
        "relative flex h-16 flex-shrink-0 items-center border-b border-border",
        collapsed ? "justify-center px-0" : "gap-2.5 px-3"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5", theme.accent)} aria-hidden />

      {collapsed ? (
        <Button variant="ghost"
          type="button"
          onClick={onToggleCollapse}
          aria-label="Mở rộng menu (⌘B)"
          title="Mở rộng menu (⌘B)"
          className={cn("font-[inherit] gap-0", 
            "group relative flex h-9 w-9 items-center justify-center rounded-lg text-primary-foreground shadow-xs",
            "transition-transform duration-150 hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
            theme.logo
          )}
        >
          <Sparkles
            size={16}
            strokeWidth={2.2}
            className="absolute transition-opacity duration-150 group-hover:opacity-0"
            aria-hidden
          />
          <PanelLeftOpen
            size={16}
            strokeWidth={2.2}
            className="absolute opacity-0 transition-opacity duration-150 group-hover:opacity-100"
            aria-hidden
          />
        </Button>
      ) : (
        <>
          <div
            className={cn(
              "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-primary-foreground shadow-xs",
              theme.logo
            )}
            aria-hidden
          >
            <Sparkles size={17} strokeWidth={2.2} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span
              className="truncate text-body-sm font-semibold leading-tight text-text"
              title={displayName}
            >
              {displayName}
            </span>
            <div className="flex min-w-0">
              <ArchitectureNametag isDev={isDev} />
            </div>
          </div>

          {drawer && onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-drawer-close=""
              aria-label={t("common.actions.close")}
              className={cn(ICON_BUTTON, "h-10 w-10")}
            >
              <X size={18} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              aria-label={t("layout.collapseSidebar")}
              title={`${t("layout.collapseSidebar")} (⌘B)`}
              className={cn(ICON_BUTTON, "h-8 w-8")}
            >
              <PanelLeftClose size={16} aria-hidden />
            </Button>
          )}
        </>
      )}
    </div>
  )
}
