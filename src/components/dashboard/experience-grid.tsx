"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "@/components/ui/icon-set/wrap"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Info } from "@/components/ui/icon-set/info"
import { X } from "@/components/ui/icon-set/x"
import { Menu } from "@/components/ui/icon-set/menu"
import { X as XIcon } from "@/components/ui/icon-set/x"
import { Zap } from "@/components/ui/icon-set/zap"
import { ScanSearch } from "@/components/ui/icon-set/scan-search"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Video } from "@/components/ui/icon-set/video"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Rss } from "@/components/ui/icon-set/rss"
import { LayoutGrid } from "@/components/ui/icon-set/layout-grid"
import { Users } from "@/components/ui/icon-set/users"
import { Package } from "@/components/ui/icon-set/package"
import { MessageCircle } from "@/components/ui/icon-set/message-circle"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { useSession } from "@/lib/session"
import { FEATURES, TRIAL_LIMIT, STATUS_META, type ModuleStatus } from "@/lib/mock-data"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { UserMenu } from "@/components/layout/user-menu"
import { cn } from "@/lib/utils"

type FeatureIdType = (typeof FEATURES)[number]["id"]

const FEATURE_ICONS: Record<FeatureIdType, LucideIcon> = {
  "phân-tích-sản-phẩm": ScanSearch,
  "creative-studio": Sparkles,
  "video-studio": Video,
  "market-intelligence": TrendingUp,
  "content-engine": FileText,
  "social-publishing": Rss,
  "catalog-website": LayoutGrid,
  "crm-khách-hàng": Users,
  "đơn-hàng-vận-hành": Package,
  "chat-assistant": MessageCircle,
  "analytics-learning": BarChart3,
  "ai-features": Zap,
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  const meta = STATUS_META[status]
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-caption font-bold",
        meta.bgClass,
        meta.textClass
      )}
    >
      <span className={cn("h-1.5 w-1.5 flex-shrink-0 rounded-full", meta.dotClass)} />
      {meta.label}
    </span>
  )
}

function routeForFeature(id: FeatureIdType): string | null {
  for (const f of FEATURES) {
    if (f.id === id && f.route && !f.disabled) return f.route
  }
  return null
}

export function ExperienceGrid() {
  const router = useRouter()
  const { orgName, userInitials } = useSession()
  const [remaining, setRemaining] = useState(TRIAL_LIMIT)
  const [noticeId, setNoticeId] = useState<FeatureIdType | null>(null)
  const [hienThongBaoNangCap, setHienThongBaoNangCap] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isLocked = remaining <= 0

  function spendTrialCredits(costPerUse: number) {
    if (costPerUse === 0) return
    setRemaining((cur) => Math.max(0, cur - costPerUse))
  }

  function openFeature(mod: (typeof FEATURES)[number]) {
    if (mod.disabled) {
      setNoticeId((cur) => (cur === mod.id ? null : mod.id))
      return
    }
    const route = routeForFeature(mod.id)
    if (route) {
      spendTrialCredits(1)
      router.push(route as never)
      return
    }
    setNoticeId((cur) => (cur === mod.id ? null : mod.id))
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-surface px-[18px] py-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-title font-extrabold text-primary">{orgName}</div>
            <span className="rounded-full bg-danger-bg px-2 py-0.5 text-caption font-bold text-primary">
              Đang dùng thử
            </span>
          </div>
          <div className="mt-0.5 text-caption text-text-muted">Workspace trải nghiệm</div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex h-9 w-9 items-center justify-center rounded-full text-text hover:bg-surface-alt md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <XIcon size={20} /> : <Menu size={20} />}
          </Button>
          <UserMenu initials={userInitials} />
        </div>
      </div>

      {menuOpen && (
        <div className="flex-shrink-0 border-b border-border bg-surface px-[18px] py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {FEATURES.map((mod) => {
              const Icon = FEATURE_ICONS[mod.id]
              const route = routeForFeature(mod.id)
              return (
                <Button variant="ghost"
                  type="button"
                  disabled={mod.disabled}
                  key={mod.id}
                  onClick={() => {
                    if (mod.disabled) return
                    setMenuOpen(false)
                    openFeature(mod)
                  }}
                  aria-disabled={mod.disabled}
                  className={cn("h-auto", "justify-start", 
                    "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-body font-medium transition-colors",
                    mod.disabled && "opacity-40 cursor-not-allowed",
                    !mod.disabled && route && "hover:bg-surface-alt",
                    !route && "text-text-muted"
                  )}
                >
                  <Icon size={18} strokeWidth={1.8} className="text-primary" />
                  <span className="flex-1">{mod.name}</span>
                  <StatusBadge status={mod.status ?? "chua_co"} />
                </Button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto p-[18px]">
        <Card className="flex flex-col gap-2.5 border-none bg-surface-alt p-4">
          <div className="flex items-baseline justify-between">
            <div className="text-body font-bold">Hạn mức dùng thử</div>
            <div className="text-body-sm font-bold text-primary">
              {remaining}/{TRIAL_LIMIT} lượt
            </div>
          </div>
          <Progress value={(remaining / TRIAL_LIMIT) * 100} />
          <Button variant="ghost"
            type="button"
            onClick={() => setHienThongBaoNangCap((v) => !v)}
            className="h-auto p-0 gap-0 w-fit cursor-pointer text-meta font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
          >
            Chuyển sang tổ chức thật →
          </Button>
          {hienThongBaoNangCap && (
            <div className="flex items-start gap-1.5 rounded-lg bg-surface px-2.5 py-2">
              <Info size={13} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-text-muted" />
              <div className="flex-1 text-caption leading-snug text-text-muted">
                Bản hiện tại chưa hỗ trợ tự chuyển đổi — liên hệ quản trị hệ thống để nâng cấp tổ chức.
              </div>
              <Button
                aria-label="Đóng"
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setHienThongBaoNangCap(false)}
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
              >
                <X size={12} strokeWidth={2.2} />
              </Button>
            </div>
          )}
        </Card>

        <div>
          <div className="mb-0.5 text-title-sm font-extrabold">Chọn chức năng để bắt đầu</div>
          <div className="text-meta text-text-muted">Bấm thẻ nào cũng được — không bắt theo thứ tự</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {FEATURES.map((mod) => {
            const Icon = FEATURE_ICONS[mod.id]
            const disabled = mod.disabled === true
            const route = routeForFeature(mod.id)
            const isWaiting = mod.waiting === true

            return (
              <div
                key={mod.id}
                aria-disabled={disabled || undefined}
                className={cn(
                  "flex flex-col gap-2.5 rounded-2xl border border-border bg-surface p-3.5 transition-shadow hover:shadow-md",
                  disabled && "opacity-45"
                )}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-alt">
                  <Icon size={22} strokeWidth={1.8} className={cn("text-primary", disabled && "opacity-50")} />
                </div>
                <div>
                  <Button variant="ghost"
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) openFeature(mod)
                    }}
                    className={cn("h-auto p-0 justify-start gap-0", 
                      "cursor-pointer text-left text-body font-bold text-text hover:text-primary transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      disabled && "cursor-not-allowed hover:text-text"
                    )}
                  >
                    {mod.name}
                  </Button>
                  <div className="mt-0.5 text-caption leading-snug text-text-muted">{mod.desc}</div>
                </div>
                <StatusBadge status={mod.status ?? "chua_co"} />
                {isWaiting && (
                  <div className="text-caption font-bold text-accent-text">
                    ● Đang chờ xử lý
                  </div>
                )}
                <div className="mt-0.5 flex items-center justify-between">
                  <span className={cn("text-caption font-bold", disabled ? "text-text-muted" : "text-secondary-text")}>
                    {disabled ? "Sắp có" : route ? "Mở ngay" : "Chưa có"}
                  </span>
                  <Button
                    aria-label={`Mở ${mod.name}`}
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled || !route}
                    onClick={() => openFeature(mod)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    <ChevronRight size={17} strokeWidth={2.4} color="white" />
                  </Button>
                </div>
                {noticeId === mod.id && (
                  <div className="flex items-start gap-1.5 rounded-lg bg-surface-alt px-2.5 py-2">
                    <Info size={13} strokeWidth={1.8} className="mt-0.5 flex-shrink-0 text-text-muted" />
                    <div className="flex-1 text-caption leading-snug text-text-muted">
                      {mod.disabled
                        ? "Tính năng này đang phát triển. Sắp có mặt trong bản sắp tới."
                        : mod.status === "chua_co"
                          ? "Chưa có màn hình cho chức năng này trong bản hiện tại."
                          : mod.status === "chua_san_sang"
                            ? "Module đang phát triển. Chức năng sẽ có trong bản sắp tới."
                            : "Chưa có màn thao tác cho chức năng này trong bản hiện tại."}
                    </div>
                    <Button
                      aria-label="Đóng"
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setNoticeId(null)}
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt"
                    >
                      <X size={12} strokeWidth={2.2} />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {isLocked && (
          <div className="flex items-center gap-3 rounded-2xl bg-warning-bg p-3.5">
            <Zap size={20} strokeWidth={1.8} className="text-warning-text" />
            <div className="flex-1 text-meta leading-snug text-warning-text">
              Đã dùng hết hạn mức dùng thử. Chuyển sang tổ chức thật để tiếp tục.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
