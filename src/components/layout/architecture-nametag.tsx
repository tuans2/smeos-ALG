"use client"

/**
 * ArchitectureNametag — Badge pill hiển thị tầng kiến trúc hiện tại.
 *
 * Ở môi trường development (isDev=true): badge là nút có thể click,
 * mở dropdown cho phép switch vai/tầng nhanh mà không cần re-login.
 * Ở production: badge chỉ đọc, không có dropdown.
 */

import { useMemo, useState, useCallback, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/lib/session"
import { cn } from "@/lib/utils"
import { FlaskConical } from "@/components/ui/icon-set/flask-conical"
import { Check } from "@/components/ui/icon-set/check"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { Button } from "@/components/ui/button"
import { DEV_ROLE_PRESETS, type DevRoleOverride } from "@/lib/dev-role-override"

const INDUSTRY_SHORT_NAME: Record<string, string> = {
  FLORAL: "Sản phẩm",
  FASHION: "Thời trang",
  FNB: "F&B",
  CRAFT_GIFT: "Quà tặng",
  HOMESTAY: "Homestay",
  RETAIL_GENERAL: "Bán lẻ",
  SERVICES: "Dịch vụ",
}

interface Props {
  /** Truyền từ Server Component: process.env.NODE_ENV !== "production" */
  isDev?: boolean
}

export function ArchitectureNametag({ isDev = false }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { organizationType, roleKey, organization } = useSession()
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

  const nametag = useMemo(() => {
    // 1. SaaS Mother
    const isPlatform =
      pathname?.startsWith("/van-hanh") ||
      organizationType === "PLATFORM" ||
      roleKey === "platform_admin"

    if (isPlatform) {
      return {
        label: "SaaS Mother",
        title: "Hệ điều hành Nền tảng Mẹ",
        badgeClass:
          // primary-dark: text-primary trên nền primary/10 chỉ ~4,3:1 ở preset modern-slate (< 4,5:1 AA)
          "bg-primary/10 text-primary-dark border-primary/20",
      }
    }

    const industryKey = (organization?.industry || "FLORAL").toUpperCase()
    const industryShort = INDUSTRY_SHORT_NAME[industryKey] || "Sản phẩm"

    // 2. SaaS Ngành (Tầng 2)
    const isIndustry =
      organizationType === "INDUSTRY" ||
      roleKey === "industry_admin"

    if (isIndustry) {
      return {
        label: `SaaS Ngành • ${industryShort}`,
        title: `Hệ điều hành Chuẩn hóa & Mạng lưới Ngành`,
        badgeClass:
          "bg-info-bg text-info border-border",
      }
    }

    // 3. ChainOS (Tầng 3)
    const isChain =
      organizationType === "CHAIN" ||
      roleKey === "flower_network_admin" ||
      roleKey === "chain_admin"

    if (isChain) {
      return {
        label: `ChainOS • ${industryShort}`,
        title: `Hệ điều hành Mạng lưới Chuỗi`,
        badgeClass:
          "bg-accent/10 text-accent border-accent/20",
      }
    }

    // 4. StoreOS (Tầng 4)
    return {
      label: `StoreOS • ${industryShort}`,
      title: `Hệ điều hành Cửa hàng Cơ sở`,
      badgeClass:
        "bg-success-bg text-success border-success-border",
    }
  }, [pathname, organizationType, roleKey, organization?.industry])

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
      } finally {
        setLoading(null)
      }
    },
    []
  )

  const badge = (
    <span
      title={nametag.title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-caption font-semibold tracking-tight leading-none shadow-2xs whitespace-nowrap select-none transition-colors",
        nametag.badgeClass,
        isDev && "cursor-pointer hover:opacity-80"
      )}
    >
      {isDev && <FlaskConical size={9} aria-hidden />}
      {nametag.label}
      {isDev && (
        <ChevronDown
          size={9}
          aria-hidden
          className={cn("transition-transform", open && "rotate-180")}
        />
      )}
    </span>
  )

  if (!isDev) return badge

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger */}
      <Button variant="ghost"
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Tầng kiến trúc: ${nametag.label}. Click để switch vai dev`}
        className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 flex items-center cursor-pointer"
      >
        {badge}
      </Button>

      {/* Dropdown panel */}
      {open && (
        <>
          {/* Lớp phủ bấm ra ngoài để đóng menu */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9990] bg-transparent cursor-default"
          />

          <div
            role="listbox"
            aria-label="Chọn vai dev"
            className="absolute left-0 top-full z-[9999] mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
          >
          {/* Header */}
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <FlaskConical size={11} className="text-text-muted" aria-hidden />
            <span className="text-caption font-bold uppercase tracking-widest text-text">
              Dev Role Override
            </span>
          </div>

          {/* Presets */}
          <ul className="divide-y divide-border">
            {DEV_ROLE_PRESETS.length === 0 ? (
              <li className="px-3 py-2 text-caption text-text-muted">Chưa có vai dev mẫu</li>
            ) : (
              DEV_ROLE_PRESETS.map((preset) => {
                const isActive = roleKey === preset.roleKey
                const isLoading = loading === preset.roleKey
                return (
                  <li key={preset.roleKey} role="option" aria-selected={isActive}>
                    <Button variant="ghost"
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        if (!isLoading) applyOverride(preset)
                      }}
                      aria-disabled={isLoading}
                      className={cn("h-auto", "justify-start", 
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-meta transition-colors cursor-pointer",
                        isActive
                          ? "bg-surface-alt font-bold text-text hover:bg-surface-alt"
                          : "text-text hover:bg-surface-alt",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isActive ? (
                        <Check size={11} className="flex-shrink-0 text-text" aria-hidden />
                      ) : (
                        <span className="h-[11px] w-[11px] flex-shrink-0" aria-hidden />
                      )}
                      <span className="flex-1">{preset.label}</span>
                      {isLoading && (
                        <span className="text-caption text-text-muted">Đang lưu…</span>
                      )}
                    </Button>
                  </li>
                )
              })
            )}
          </ul>

          {/* Clear override */}
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => applyOverride(null)}
              disabled={loading === "clear"}
              className="w-full text-center text-caption text-text hover:bg-surface-alt"
            >
              {loading === "clear" ? "Đang xoá…" : "↩ Xoá override — dùng session thật"}
            </Button>
          </div>
        </div>
      </>
    )}
    </div>
  )
}
