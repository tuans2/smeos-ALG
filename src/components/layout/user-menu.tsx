"use client"

// Menu tài khoản dùng chung cho Header và Sidebar Navigation.
// Cung cấp avatar viết tắt, thông tin người dùng, chuyển đổi vai trò và nút Đăng xuất.

import { Button } from "@/components/ui/button"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "@/components/ui/icon-set/building2"
import { KeyRound } from "@/components/ui/icon-set/key-round"
import { LogOut } from "@/components/ui/icon-set/log-out"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { UserRound } from "@/components/ui/icon-set/user-round"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { ChangePasswordDialog } from "./change-password-dialog"
import { MyOrganizationsDialog } from "./my-organizations-dialog"
import { useUiStudioAvailable } from "./ui-studio-availability"

export interface UserMenuProps {
  initials: string
  direction?: "up" | "down"
  size?: "sm" | "md"
}

export function UserMenu({ initials, direction = "down", size = "md" }: UserMenuProps) {
  const router = useRouter()
  const [mo, setMo] = useState(false)
  const [dangXuat, setDangXuat] = useState(false)
  const [doiMatKhau, setDoiMatKhau] = useState(false)
  const [toChuc, setToChuc] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { roleUx, userName, userEmail, orgName, can, platformCapabilities } = useSession()
  const uiStudioAvailable = useUiStudioAvailable()
  const { t } = useI18n()

  useEffect(() => {
    if (!mo) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMo(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [mo])

  async function handleLogout() {
    setDangXuat(true)
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" })
    } catch {
      // Vẫn chuyển hướng dù logout API lỗi (token hết hạn phía server)
    } finally {
      router.push("/dang-nhap")
      router.refresh()
    }
  }

  // Lối tắt Console Vận hành: chỉ người vận hành nền tảng thật, không xét đuôi email (rà soát H11)
  const isSuperUser = (platformCapabilities ?? []).length > 0

  return (
    <div className="relative">
      <Button variant="ghost"
        ref={buttonRef}
        type="button"
        onClick={() => setMo((v) => !v)}
        aria-label="Menu tài khoản"
        aria-expanded={mo}
        className={cn("h-auto p-0 gap-0", 
          "flex items-center justify-center rounded-full bg-primary font-bold text-white shadow-xs transition-opacity hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer hover:bg-primary",
          size === "sm" ? "h-9 w-9 text-caption" : "h-10 w-10 text-body-sm"
        )}
      >
        {initials}
      </Button>

      {mo && (
        <>
          {/* Lớp phủ để bấm ra ngoài là đóng menu */}
          <Button variant="ghost"
            type="button"
            aria-label="Đóng menu"
            tabIndex={-1}
            onClick={() => setMo(false)}
            className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 fixed inset-0 z-40 bg-transparent cursor-default border-0"
          />

          {/* Menu popover */}
          <div
            className={cn(
              "absolute z-50 w-56 overflow-hidden rounded-xl border border-border bg-surface shadow-lg",
              direction === "up" ? "bottom-full mb-2 left-0" : "top-full mt-2 right-0"
            )}
          >
            {/* Header thông tin người dùng */}
            <div className="border-b border-border bg-surface-alt px-3.5 py-2.5">
              <div className="truncate text-caption font-bold text-text">
                {userName || "Người dùng"}
              </div>
              <div className="truncate text-caption text-text-muted">
                {roleUx?.label ?? (orgName || "").replace(/\s*\(\s*dev\s*\)/gi, "").trim()}
              </div>
            </div>

            {/* Lối tắt vào Console Vận hành dành riêng cho Super Admin / Operator */}
            {isSuperUser && (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  setMo(false)
                  router.push("/van-hanh" as never)
                }}
                className="h-auto justify-start flex w-full items-center gap-2 border-b border-border bg-primary/5 px-3.5 py-2.5 text-left text-body-sm font-semibold text-primary hover:bg-primary/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
              >
                <ShieldCheck size={16} strokeWidth={2} className="text-primary shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-bold">Console Vận hành</span>
                  <span className="block truncate text-caption font-medium text-text-muted">
                    Quản trị SaaS nền tảng
                  </span>
                </span>
              </Button>
            )}

            {/* Vai trải nghiệm hiện tại + danh mục 14 vai (đặc tả 03b §3) */}
            <Button variant="ghost"
              type="button"
              onClick={() => {
                setMo(false)
                router.push("/vai-tro" as never)
              }}
              className="h-auto justify-start flex w-full items-center gap-2 border-b border-border px-3.5 py-2.5 text-left text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              <UserRound size={16} strokeWidth={1.8} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block">Vai trò trải nghiệm</span>
                {roleUx && (
                  <span className="block truncate text-caption font-medium text-text-muted">
                    {roleUx.label}
                  </span>
                )}
              </span>
            </Button>

            {/* Mở UI Studio — chỉ khi shell hiện tại có gắn ngăn UI Studio (ADR-011 D-UI-01) */}
            {uiStudioAvailable && (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  setMo(false)
                  window.dispatchEvent(new CustomEvent("open-ui-studio"))
                }}
                className="h-auto justify-start flex w-full items-center gap-2 border-b border-border px-3.5 py-2.5 text-left text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-fg text-caption font-bold">
                  🎨
                </span>
                <span className="min-w-0">
                  <span className="block">Giao diện (UI Studio)</span>
                  <span className="block truncate text-caption font-medium text-text-muted">
                    Đổi Theme, Font, Mật độ
                  </span>
                </span>
              </Button>
            )}

            {/* Chuyển cửa hàng + nhận lời mời vào cửa hàng khác (audit hành trình UJ-14) */}
            <Button variant="ghost"
              type="button"
              onClick={() => {
                setMo(false)
                setToChuc(true)
              }}
              className="h-auto justify-start flex w-full items-center gap-2 border-b border-border px-3.5 py-2.5 text-left text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              <Building2 size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>Tổ chức của tôi</span>
            </Button>

            {can("A2") && (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  setMo(false)
                  setDoiMatKhau(true)
                }}
                className="h-auto justify-start flex w-full items-center gap-2 border-b border-border px-3.5 py-2.5 text-left text-body-sm font-semibold text-text hover:bg-surface-alt transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
              >
                <KeyRound size={16} strokeWidth={1.8} aria-hidden="true" />
                <span>Đổi mật khẩu</span>
              </Button>
            )}

            {/* Nút đăng xuất */}
            <Button variant="ghost"
              type="button"
              onClick={handleLogout}
              disabled={dangXuat}
              className="h-auto justify-start flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-body-sm font-semibold text-danger hover:bg-danger-bg transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary cursor-pointer"
            >
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              <span>{dangXuat ? "Đang đăng xuất…" : t("layout.userMenu.logout")}</span>
            </Button>
          </div>
        </>
      )}
      <ChangePasswordDialog open={doiMatKhau} onOpenChange={setDoiMatKhau} />
      <MyOrganizationsDialog open={toChuc} onOpenChange={setToChuc} />
    </div>
  )
}
