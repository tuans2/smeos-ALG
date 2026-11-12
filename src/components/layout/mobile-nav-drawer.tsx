"use client"

// Thanh trên cùng + ngăn kéo điều hướng (burger menu) cho điện thoại.
// Dùng lại đúng sidebar của màn hình lớn để cửa hàng và chuỗi thấy cùng một menu.
// Trang có thanh tiêu đề riêng gắn <MobileMenuButton /> → thanh chung tự ẩn.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "@/components/ui/icon-set/menu"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/session"
import { DesktopNav } from "./desktop-nav"
import { MobileNavContext, OPEN_MOBILE_NAV_EVENT } from "./mobile-nav-context"

export function MobileNavDrawer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { orgName } = useSession()
  // Lưu trang lúc mở; đổi trang → ngăn kéo tự đóng
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt === pathname
  const [ownHeaders, setOwnHeaders] = useState(0)
  const drawerRef = useRef<HTMLDivElement>(null)

  const registerOwnHeader = useCallback(() => {
    setOwnHeaders((n) => n + 1)
    return () => setOwnHeaders((n) => n - 1)
  }, [])

  const api = useMemo(
    () => ({ openMenu: () => setOpenedAt(pathname), open, registerOwnHeader }),
    [pathname, open, registerOwnHeader]
  )

  // Thanh dưới (nằm ngoài ngăn menu) xin mở menu
  useEffect(() => {
    const onRequest = () => setOpenedAt(pathname)
    window.addEventListener(OPEN_MOBILE_NAV_EVENT, onRequest)
    return () => window.removeEventListener(OPEN_MOBILE_NAV_EVENT, onRequest)
  }, [pathname])

  // Khóa cuộn nền + phím Esc để đóng
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Đưa tiêu điểm vào menu; đóng lại thì trả về nút burger đã bấm
    const burger = document.activeElement as HTMLElement | null
    drawerRef.current?.querySelector<HTMLElement>("button[aria-label=\"Đóng menu\"]")?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenedAt(null)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      burger?.focus()
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const close = () => setOpenedAt(null)

  return (
    <MobileNavContext.Provider value={api}>
      {ownHeaders === 0 && (
        <header className="sticky top-0 z-30 flex h-13 flex-shrink-0 items-center gap-2.5 border-b border-border/80 bg-surface/95 backdrop-blur-md px-3 pt-[env(safe-area-inset-top)] md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={api.openMenu}
            aria-label="Mở menu"
            aria-expanded={open}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text hover:bg-surface-alt active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all cursor-pointer"
          >
            <Menu size={22} />
          </Button>
          <span className="truncate text-title-sm font-bold text-text">
            {(orgName || "ALG").replace(/\s*\(\s*dev\s*\)/gi, "").trim()}
          </span>
        </header>
      )}

      {children}

      {open && (
        <div ref={drawerRef} className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu điều hướng">
          <div className="flex animate-in slide-in-from-left duration-200 z-10 shadow-2xl">
            <DesktopNav drawer onNavigate={close} onClose={close} />
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-label="Đóng menu"
            onClick={close}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                close()
              }
            }}
            className="flex-1 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
          />
        </div>
      )}
    </MobileNavContext.Provider>
  )
}
