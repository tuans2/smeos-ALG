"use client"

import { Button } from "@/components/ui/button"
import { Check } from "@/components/ui/icon-set/check"
import { Lock } from "@/components/ui/icon-set/lock"
import { cn } from "@/lib/utils"
import type { BrandStep } from "@/modules/brand-kit/domain/brand-journey"
import type { BrandKitView } from "@/modules/brand-kit/use-cases/get-brand-kit"

const LOCK_HINT: Record<BrandStep, string> = {
  PROFILE: "",
  IDENTITY: "Mở khi hồ sơ đủ",
  LANDING: "Mở khi đã chọn bộ nhận diện",
}

function stepSummary(view: BrandKitView, key: BrandStep): { text: string; percent: number } {
  if (key === "PROFILE") {
    const done = view.profile.items.filter((i) => i.done).length
    return { text: `Đã có ${done}/${view.profile.items.length} mục cần thiết`, percent: Math.round((done / view.profile.items.length) * 100) }
  }
  if (key === "IDENTITY") {
    const chosen = view.identity.options.find((o) => o.selected)
    if (chosen) return { text: `Đang dùng: ${chosen.style_label}`, percent: 100 }
    return { text: view.identity.options.length ? "Chọn 1 trong các phong cách" : "Chưa tạo phương án", percent: view.identity.options.length ? 50 : 0 }
  }
  if (view.landing.published_path) return { text: "Đã xuất bản", percent: 100 }
  return { text: view.landing.options.length ? "Chọn giao diện và xuất bản" : "Chưa tạo phương án", percent: view.landing.options.length ? 50 : 0 }
}

/** Hàng 3 ô bước — thay thanh tab; ô khoá không bấm được và nói rõ điều kiện mở. */
export function StepTiles({ view, current, onPick }: { view: BrandKitView; current: BrandStep; onPick: (k: BrandStep) => void }) {
  return (
    <nav aria-label="Các bước xây thương hiệu" className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
      {view.steps.map((s, i) => {
        const locked = s.status === "LOCKED"
        const done = s.status === "COMPLETED"
        const active = s.key === current
        const sum = stepSummary(view, s.key)
        return (
          <div
            key={s.key}
            className={cn(
              "relative flex items-center gap-3 rounded-2xl p-4 transition-all",
              locked ? "bg-surface-alt" : "bg-surface shadow-sm ring-1 ring-border/70 hover:ring-primary",
              active && "ring-2 ring-primary shadow-md",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-title-sm font-extrabold",
                locked ? "border border-border bg-surface text-text-muted" : done && !active ? "bg-success-bg text-success-text" : "bg-primary text-surface",
              )}
            >
              {locked ? <Lock size={16} aria-hidden /> : done && !active ? <Check size={16} aria-hidden /> : i + 1}
            </div>
            <div className="min-w-0 flex-1">
              {locked ? (
                <p className="text-body font-bold text-text-muted">{i + 1}. {s.label}</p>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  aria-current={active ? "step" : undefined}
                  onClick={() => onPick(s.key)}
                  className="h-auto gap-0 p-0 text-left text-body font-bold text-text hover:bg-transparent after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-primary"
                >
                  {i + 1}. {s.label}
                </Button>
              )}
              <p className="truncate text-caption text-text-muted">{locked ? LOCK_HINT[s.key] : sum.text}</p>
              {!locked && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div className={cn("h-full rounded-full", sum.percent === 100 ? "bg-success" : "bg-primary")} style={{ width: `${sum.percent}%` }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
