"use client"

import { Button } from "@/components/ui/button"
import { Check } from "@/components/ui/icon-set/check"
import { Lock } from "@/components/ui/icon-set/lock"
import { cn } from "@/lib/utils"
import type { JourneyStepStatus } from "@/modules/journey/domain/journey-model"

export interface JourneyStepTile<K extends string> {
  readonly key: K
  readonly label: string
  readonly status: JourneyStepStatus
  /** Dòng phụ: tóm tắt tiến độ, hoặc điều kiện mở khi khoá */
  readonly summary: string
  readonly percent: number
}

const COLS: Record<3 | 4, string> = { 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }

/**
 * Hàng ô bước của các hành trình trên /cong-cu (Thương hiệu 3 bước, Tạo nội dung 4 bước) — thay thanh tab.
 * Ô khoá không bấm được và nói rõ điều kiện mở; cả ô bấm được qua nút phủ (`after:absolute after:inset-0`).
 */
export function JourneyStepTiles<K extends string>({
  steps, current, onPick, label, cols = 3,
}: { steps: readonly JourneyStepTile<K>[]; current: K; onPick: (k: K) => void; label: string; cols?: 3 | 4 }) {
  return (
    <nav aria-label={label} className={cn("grid grid-cols-1 gap-3 sm:gap-4", COLS[cols])}>
      {steps.map((s, i) => {
        const locked = s.status === "LOCKED"
        const done = s.status === "COMPLETED"
        const active = s.key === current
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
                locked ? "border border-border bg-surface text-text-muted"
                  : active ? "bg-primary text-surface"
                    : done ? "bg-success-bg text-success-text" : "bg-primary-muted text-primary",
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
              <p className="truncate text-caption text-text-muted">{s.summary}</p>
              {!locked && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
                  <div className={cn("h-full rounded-full", s.percent === 100 ? "bg-success" : "bg-primary")} style={{ width: `${s.percent}%` }} />
                </div>
              )}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
