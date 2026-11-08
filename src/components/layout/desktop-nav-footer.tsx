"use client"

/**
 * DesktopNavFooter — Footer thanh điều hướng bên trái
 * Bao gồm: Nút Copilot (⌘K) + Thẻ người dùng + Đăng xuất (một hàng gọn, không khung lồng khung)
 *
 * Hỗ trợ collapsed mode: chỉ hiển thị icon.
 */

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bot } from "@/components/ui/icon-set/bot"
import { LogOut } from "@/components/ui/icon-set/log-out"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { UserMenu } from "./user-menu"

interface DesktopNavFooterProps {
  collapsed?: boolean
}

export function DesktopNavFooter({ collapsed = false }: DesktopNavFooterProps) {
  const router = useRouter()
  const { userName, userInitials, orgName, roleUx } = useSession()
  const { t } = useI18n()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleQuickLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" })
    } catch {
      // Vẫn chuyển hướng dù lỗi mạng hoặc phiên đã hết hạn
    } finally {
      router.push("/dang-nhap")
      router.refresh()
    }
  }

  const displayRole = roleUx?.label ?? (orgName || "").replace(/\s*\(\s*dev\s*\)/gi, "").trim()

  const openCopilot = () =>
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))

  // ─── Collapsed: icon-only stack ───────────────────────────────
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-border px-2 py-3">
        <Button variant="ghost"
          type="button"
          title="smeOS Copilot (⌘K)"
          aria-label="Mở smeOS Copilot"
          onClick={openCopilot}
          className={cn("font-[inherit] gap-0", 
            "flex h-10 w-10 items-center justify-center rounded-lg text-primary",
            "transition-colors duration-150 hover:bg-primary-muted",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          )}
        >
          <Bot size={20} aria-hidden />
        </Button>
        <UserMenu initials={userInitials || "U"} direction="up" size="sm" />
      </div>
    )
  }

  // ─── Expanded: Copilot + thẻ người dùng ────────────────────────
  return (
    <div className="flex flex-col gap-1 border-t border-border p-3">
      <Button variant="outline"
        type="button"
        onClick={openCopilot}
        className={cn("justify-start font-[inherit]", 
          "group flex h-10 w-full items-center gap-2.5 rounded-lg border border-border bg-surface px-2.5 text-left shadow-xs hover:bg-surface",
          "transition-colors duration-150 hover:border-primary-border hover:bg-primary-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        )}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Bot size={14} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text" title="Trợ lý AI 24/7">
          smeOS Copilot
        </span>
        {/* Nền surface: text-muted trên surface-alt chỉ ~4,3:1 ở modern-slate/pure-swiss (< 4,5:1 AA) */}
        <kbd className="shrink-0 rounded border border-border bg-surface px-1.5 py-px font-mono text-caption text-text-muted">
          ⌘K
        </kbd>
      </Button>

      <div className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors duration-150 hover:bg-surface-alt">
        <UserMenu initials={userInitials || "U"} direction="up" size="sm" />

        <div className="min-w-0 flex-1">
          <div className="truncate text-body-sm font-semibold leading-tight text-text" title={userName}>
            {userName || "Người dùng"}
          </div>
          <div className="truncate text-caption leading-tight text-text-muted" title={displayRole}>
            {displayRole}
          </div>
        </div>

        <Button variant="ghost"
          type="button"
          onClick={handleQuickLogout}
          disabled={loggingOut}
          title={t("layout.userMenu.logout")}
          aria-label={t("layout.userMenu.logout")}
          className={cn("font-[inherit] gap-0", 
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted",
            "transition-colors duration-150 hover:bg-danger-bg hover:text-danger disabled:cursor-wait",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          )}
        >
          <LogOut size={16} aria-hidden />
        </Button>
      </div>
    </div>
  )
}
