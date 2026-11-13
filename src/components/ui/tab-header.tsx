"use client"

import React, { useEffect } from "react"
import { MoreHorizontal } from "@/components/ui/icon-set/more-horizontal"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface TabItem {
  id: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; weight?: "regular" | "fill" }>
  badge?: string | number
  badgeTone?: "neutral" | "success" | "warning" | "danger" | "accent"
  disabled?: boolean
}

export interface TabAction {
  id: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; weight?: "regular" | "fill" }>
  variant?: "primary" | "secondary" | "outline" | "danger" | "success"
  onClick: () => void | Promise<void>
  disabled?: boolean
  loading?: boolean
  tooltip?: string
}

export interface TabOverflowAction {
  id: string
  label: string
  icon?: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number; weight?: "regular" | "fill" }>
  onClick: () => void | Promise<void>
  disabled?: boolean
  destructive?: boolean
  dividerAbove?: boolean
}

export interface TabActionHeaderProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  primaryActions?: TabAction[]
  overflowActions?: TabOverflowAction[]
  className?: string
}

export function TabActionHeader({
  tabs,
  activeTab,
  onTabChange,
  primaryActions = [],
  overflowActions = [],
  className = "",
}: TabActionHeaderProps) {
  // K2 & 03a UX-010 validation in development
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      const primaryCount = primaryActions.filter((a) => !a.variant || a.variant === "primary").length
      if (primaryCount > 1) {
        console.warn(
          `[TabActionHeader] Hơn 1 nút chính (${primaryCount}) — vi phạm K2/03a UX-010:`,
          tabs.map((t) => t.id)
        )
      }
      if (primaryActions.length > 3) {
        console.warn(
          `[TabActionHeader] Tổng nút hiển thị vượt quá 3 (${primaryActions.length}) — vi phạm K2/03a UX-010:`,
          tabs.map((t) => t.id)
        )
      }
    }
  }, [primaryActions, tabs])

  const getVariantStyles = (variant: TabAction["variant"] = "primary") => {
    switch (variant) {
      case "primary":
        return "bg-primary text-white hover:bg-primary-dark shadow-sm shadow-primary/20"
      case "success":
        return "bg-success text-white hover:opacity-90 shadow-sm"
      case "secondary":
        return "bg-surface-alt text-text hover:bg-border"
      case "danger":
        return "bg-danger text-white hover:opacity-90 shadow-sm"
      case "outline":
      default:
        return "border border-border bg-surface text-text hover:bg-surface-alt hover:text-primary"
    }
  }

  const getBadgeStyles = (tone: TabItem["badgeTone"] = "neutral") => {
    switch (tone) {
      case "success":
        return "bg-success-bg text-success-text border-success/30"
      case "warning":
        return "bg-warning-bg text-warning-text border-warning/30"
      case "danger":
        return "bg-danger-bg text-danger-text border-danger/30"
      case "accent":
        return "bg-selected text-selected-text border-primary/30"
      case "neutral":
      default:
        return "bg-surface-alt text-text-muted border-border"
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 p-1.5 bg-surface-alt/90 rounded-2xl border border-border",
        className
      )}
    >
      {/* Left: Tab List */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0" role="tablist">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 py-2 px-3.5 rounded-xl text-caption sm:text-body-sm font-bold transition-all whitespace-nowrap flex-shrink-0",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                isActive
                  ? "bg-surface text-primary shadow-sm border border-border"
                  : "text-text-muted hover:text-text hover:bg-surface/60",
                tab.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {Icon && (
                <Icon
                  size={15}
                  weight={isActive ? "fill" : "regular"}
                  className={isActive ? "text-primary" : "text-text-muted"}
                />
              )}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "ml-0.5 text-caption font-extrabold px-1.5 py-0.5 rounded-full border",
                    getBadgeStyles(tab.badgeTone)
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Right: Action Buttons and Overflow Menu */}
      {(primaryActions.length > 0 || overflowActions.length > 0) && (
        <div className="flex items-center gap-2 justify-end flex-shrink-0 ml-auto pr-1">
          {primaryActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                title={action.tooltip || action.label}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 h-8 sm:h-9 rounded-xl text-caption font-bold transition-all",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  getVariantStyles(action.variant),
                  (action.disabled || action.loading) && "opacity-60 cursor-not-allowed"
                )}
              >
                {action.loading ? (
                  <Loader2 size={14} className="animate-spin motion-reduce:hidden" />
                ) : (
                  Icon && <Icon size={14} strokeWidth={2.2} />
                )}
                <span>{action.label}</span>
              </button>
            )
          })}

          {overflowActions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger
                title="Thao tác khác"
                aria-label="Thao tác khác"
                className="flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-xl border border-border bg-surface text-text hover:bg-surface-alt hover:text-primary transition-all shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <MoreHorizontal size={16} strokeWidth={2.2} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[200px]">
                <DropdownMenuLabel>Thao tác tab</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {overflowActions.map((item) => {
                  const ItemIcon = item.icon
                  return (
                    <React.Fragment key={item.id}>
                      {item.dividerAbove && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        destructive={item.destructive}
                        disabled={item.disabled}
                        onClick={() => void item.onClick()}
                      >
                        {ItemIcon && (
                          <ItemIcon
                            size={14}
                            className={item.destructive ? "text-danger" : "text-text-muted"}
                          />
                        )}
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    </React.Fragment>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </div>
  )
}
