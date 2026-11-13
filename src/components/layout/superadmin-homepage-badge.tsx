"use client"

/**
 * SuperadminHomepageBadge — Badge hiển thị homepage đang active khi dùng
 * superadmin hoặc dev role override.
 *
 * Trong môi trường dev (isDev=true): Cho phép click để mở dropdown switch nhanh
 * giữa 4 tầng kiến trúc (SaaS Mother, SaaS Đa Ngành, ChainOS, StoreOS)
 * và tự động chuyển về đúng Homepage của tầng đó.
 */

import { useState, useRef, useEffect, useCallback } from "react"
import { Monitor } from "@/components/ui/icon-set/monitor"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { Check } from "@/components/ui/icon-set/check"
import { FlaskConical } from "@/components/ui/icon-set/flask-conical"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { DEV_ROLE_PRESETS, type DevRoleOverride } from "@/lib/dev-role-override"

const HOMEPAGE_LABEL: Record<string, { label: string; color: string }> = {
  PLATFORM_JOURNEY_HOME: {
    label: "Platform Home",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  INDUSTRY_JOURNEY_HOME: {
    label: "Industry Home",
    color: "bg-info-bg text-info border-border",
  },
  TOOLKIT_HOME: {
    label: "🧰 Toolkit Hub",
    color: "bg-warning-bg text-warning-text border-warning-border",
  },
  NETWORK_JOURNEY_HOME: {
    label: "Network Home",
    color: "bg-accent/10 text-accent-text border-accent/20",
  },
  CONTROL_TOWER: {
    label: "Tháp điều phối đơn",
    color: "bg-accent/10 text-accent-text border-accent/20",
  },
  FLOWER_NETWORK_COMMAND_CENTER: {
    label: "Flower Network",
    color: "bg-accent/10 text-accent-text border-accent/20",
  },
  STORE_JOURNEY_HOME: {
    label: "Store Home",
    color: "bg-success-bg text-success border-success-border",
  },
  STORE_GROWTH_CENTER: {
    label: "Growth Center",
    color: "bg-success-bg text-success border-success-border",
  },
  STORE_COMMAND_CENTER: {
    label: "Command Center",
    color: "bg-success-bg text-success border-success-border",
  },
  CONTROL_CENTER: {
    label: "Command Center",
    color: "bg-success-bg text-success border-success-border",
  },
  SALES_WORKSPACE: {
    label: "Sales Workspace",
    color: "bg-warning-bg text-warning-text border-warning-border",
  },
  PRODUCT_WORKSPACE: {
    label: "Product Workspace",
    color: "bg-info-bg text-info border-border",
  },
  CREATIVE_WORKSPACE: {
    label: "Creative Workspace",
    color: "bg-primary/10 text-primary border-primary/20",
  },
  CRM_WORKSPACE: {
    label: "CRM Workspace",
    color: "bg-success-bg text-success border-success-border",
  },
  CUSTOMER_SERVICE_WORKSPACE: {
    label: "CS Workspace",
    color: "bg-info-bg text-info border-border",
  },
}

interface Props {
  /** isDev: true khi NODE_ENV !== "production" */
  isDev?: boolean
}

export function SuperadminHomepageBadge({ isDev = false }: Props) {
  const { roleKey, roleUx } = useSession()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const applyOverride = useCallback(
    async (override: DevRoleOverride | null) => {
      const key = override?.roleKey ?? "clear"
      setLoading(key)
      try {
        if (override === null) {
          await fetch("/api/dev/role-override", { method: "DELETE" })
        } else {
          await fetch("/api/dev/role-override", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(override),
          })
        }
        if (override?.roleKey === "platform_admin") {
          window.location.href = "/van-hanh"
        } else {
          window.location.href = "/"
        }
        setOpen(false)
      } catch (err) {
        console.error("Lỗi cập nhật vai dev:", err)
      } finally {
        setLoading(null)
      }
    },
    []
  )

  // Chỉ hiển thị khi là vai quản trị cấp cao hoặc trong môi trường dev
  const isSuperContext =
    roleKey === "platform_admin" ||
    roleKey === "industry_admin" ||
    roleKey === "flower_network_admin" ||
    roleKey === "chain_admin" ||
    roleKey === "store_admin" ||
    isDev

  if (!isSuperContext || !roleUx) return null

  const homepageKey = roleUx.homepage
  if (!homepageKey || homepageKey === "NOT_BUILT") return null

  const config = HOMEPAGE_LABEL[homepageKey] || {
    label: homepageKey,
    color: "bg-surface-alt text-text-muted border-border",
  }

  const badgeContent = (
    <span
      title={`Homepage đang active: ${homepageKey}${isDev ? " (Click để đổi tầng/vai)" : ""}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded border px-1 py-0.5 text-caption font-bold tracking-tight leading-none whitespace-nowrap select-none transition-opacity",
        config.color,
        isDev && "cursor-pointer hover:opacity-80"
      )}
    >
      <Monitor size={8} aria-hidden />
      {config.label}
      {isDev && (
        <ChevronDown
          size={8}
          aria-hidden
          className={cn("transition-transform ml-0.5", open && "rotate-180")}
        />
      )}
    </span>
  )

  if (!isDev) return badgeContent

  return (
    <div ref={panelRef} className="relative inline-flex items-center">
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Homepage: ${config.label}. Click để đổi vai`}
        className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 flex items-center cursor-pointer"
      >
        {badgeContent}
      </Button>

      {open && (
        <div
          role="group"
          aria-label="Chọn tầng / vai trò"
          className="absolute left-0 top-full z-[9999] mt-1.5 w-64 overflow-hidden rounded-xl border border-primary/20 bg-surface shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-1.5 border-b border-border bg-surface-alt px-3 py-2">
            <FlaskConical size={12} className="text-primary" aria-hidden />
            <span className="text-caption font-bold uppercase tracking-widest text-text">
              Chuyển Tầng & Vai Trò
            </span>
          </div>

          {/* Presets */}
          <ul className="divide-y divide-border">
            {DEV_ROLE_PRESETS.map((preset) => {
              const isActive = roleKey === preset.roleKey
              const isLoading = loading === preset.roleKey
              return (
                <li key={preset.roleKey}>
                  <Button variant="ghost"
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (!isLoading) applyOverride(preset)
                    }}
                    aria-disabled={isLoading}
                    aria-pressed={isActive}
                    className={cn("h-auto", "justify-start", 
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-caption transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 font-bold text-primary hover:bg-primary/10"
                        : "text-text hover:bg-surface-alt",
                      isLoading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isActive ? (
                      <Check size={12} className="flex-shrink-0 text-primary" aria-hidden />
                    ) : (
                      <span className="h-3 w-3 flex-shrink-0" aria-hidden />
                    )}
                    <span className="flex-1 truncate">{preset.label}</span>
                    {isLoading && (
                      <span className="text-caption text-primary animate-pulse motion-reduce:animate-none">Đang nạp…</span>
                    )}
                  </Button>
                </li>
              )
            })}
          </ul>

          {/* Clear override */}
          <div className="border-t border-border p-2 bg-surface-alt/50">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyOverride(null)}
              disabled={loading === "clear"}
              className="w-full rounded-lg px-3 py-1.5 text-center text-caption font-semibold text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
            >
              {loading === "clear" ? "Đang xoá…" : "↩ Xoá override — dùng session thật"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
