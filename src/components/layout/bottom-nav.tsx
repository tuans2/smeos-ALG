"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { Camera } from "@/components/ui/icon-set/camera"
import { Plus } from "@/components/ui/icon-set/plus"
import { Tag } from "@/components/ui/icon-set/tag"
import { Home } from "@/components/ui/icon-set/home"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Package } from "@/components/ui/icon-set/package"
import { useSession } from "@/lib/session"
import { useI18n } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { mobileSecondSlot, NAV_ENTRIES, type NavEntry } from "./nav-model"
import { NAV_ICONS as ICONS } from "./nav-icons"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"
import { requestOpenMobileNav } from "./mobile-nav-context"

export function BottomNav() {
  const pathname = usePathname()
  const { can, roleUx, organizationType } = useSession()
  const { t } = useI18n()
  const canApprove = can("H3") || can("I2")

  const slot2 = mobileSecondSlot(can, roleUx, undefined, undefined, organizationType)
  const Slot2Icon = ICONS[slot2.iconKey] || Tag

  // Nút giữa gác H1: có H1 thì là Tải ảnh (Camera), không có H1 thì lấy việc chính đầu tiên hoặc Sản phẩm
  const hasH1 = can("H1")
  let centerAction: { href: string; label: string; icon: LucideIcon }
  if (hasH1) {
    centerAction = { href: "/tai-anh", label: "Tải ảnh", icon: Camera }
  } else {
    const fallbackHref = roleUx?.navPriority.find((h) => h !== slot2.href && h !== "/") ?? "/san-pham"
    const fallbackEntry = NAV_ENTRIES.find((e) => e.href === fallbackHref)
    centerAction = {
      href: fallbackEntry?.href ?? "/san-pham",
      label: fallbackEntry?.mobileLabel ?? fallbackEntry?.label ?? "Sản phẩm",
      icon: (fallbackEntry ? ICONS[fallbackEntry.iconKey] : null) || Package,
    }
  }

  const CenterIcon = centerAction.icon

  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-border bg-surface/95 backdrop-blur-md px-1 pb-[env(safe-area-inset-bottom)] md:hidden shadow-lg shadow-black/5"
    >
      {/* 1. Trang chủ */}
      <Link
        href={"/" as never}
        aria-current={pathname === "/" ? "page" : undefined}
        className={cn(
          "relative flex flex-1 flex-col items-center justify-center gap-1 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors",
          pathname === "/" && "font-bold text-primary"
        )}
      >
        {pathname === "/" && (
          <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
        )}
        <Home size={20} weight={pathname === "/" ? "fill" : "regular"} />
        <span className="text-caption">{t("layout.home")}</span>
      </Link>

      {/* 2. Ô thứ hai theo vai */}
      {(() => {
        const isSlot2Active = pathname === slot2.href || (slot2.href !== "/" && pathname.startsWith(`${slot2.href}/`))
        return (
          <Link
            href={slot2.href as never}
            aria-current={isSlot2Active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors",
              isSlot2Active && "font-bold text-primary"
            )}
          >
            {isSlot2Active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
            )}
            <Slot2Icon size={20} weight={isSlot2Active ? "fill" : "regular"} />
            <span className="text-caption truncate max-w-[64px]">
              {slot2.mobileLabel || slot2.label}
            </span>
          </Link>
        )
      })()}

      {/* 3. Nút hành động chính ở giữa (Tải ảnh hoặc Việc chính đầu tiên) */}
      <Link
        href={centerAction.href as never}
        aria-current={pathname === centerAction.href ? "page" : undefined}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="-mt-5 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
          <CenterIcon size={22} className="text-white" strokeWidth={2} />
        </div>
        <span className="text-caption font-bold text-primary truncate max-w-[64px]">
          {centerAction.label}
        </span>
      </Link>

      {/* 4. Duyệt hoặc Job */}
      {canApprove ? (
        (() => {
          const isDuyetActive = pathname === "/duyet" || pathname.startsWith("/duyet/")
          return (
            <Link
              href={"/duyet" as never}
              aria-current={isDuyetActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors",
                isDuyetActive && "font-bold text-primary"
              )}
            >
              {isDuyetActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
              )}
              <div className="relative">
                <CheckCircle2 size={20} weight={isDuyetActive ? "fill" : "regular"} />
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-caption">{t("layout.approve")}</span>
            </Link>
          )
        })()
      ) : (
        (() => {
          const isJobActive = pathname === "/job" || pathname.startsWith("/job/")
          return (
            <Link
              href={"/job" as never}
              aria-current={isJobActive ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-1 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors",
                isJobActive && "font-bold text-primary"
              )}
            >
              {isJobActive && (
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
              )}
              <Clock size={20} weight={isJobActive ? "fill" : "regular"} />
              <span className="text-caption">{t("layout.myJobs")}</span>
            </Link>
          )
        })()
      )}

      {/* 5. Thêm — trang /them không thuộc giai đoạn bàn giao thì mở menu ☰ thay vì sang trang không có */}
      {(() => {
        const themInPhase = isHrefInPhase("/them")
        const isThemActive = themInPhase && (pathname === "/them" || pathname.startsWith("/them/"))
        return (
          <Link
            href={(themInPhase ? "/them" : pathname) as never}
            {...(themInPhase
              ? {}
              : {
                  role: "button",
                  "aria-haspopup": "dialog" as const,
                  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault()
                    requestOpenMobileNav()
                  },
                })}
            aria-current={isThemActive ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center justify-center gap-1 text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors",
              isThemActive && "font-bold text-primary"
            )}
          >
            {isThemActive && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />
            )}
            <Plus size={20} weight={isThemActive ? "fill" : "regular"} />
            <span className="text-caption">{t("layout.more")}</span>
          </Link>
        )
      })()}
    </nav>
  )
}
