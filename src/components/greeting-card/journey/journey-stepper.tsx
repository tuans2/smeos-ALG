"use client"

import { Button } from "@/components/ui/button"
import { Check } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export type JourneyStep = 1 | 2 | 3

const STEPS: { id: JourneyStep; short: string; title: string; hint: string }[] = [
  { id: 1, short: "Bộ sưu tập", title: "Chọn bộ sưu tập", hint: "Sản phẩm khách sẽ xem" },
  { id: 2, short: "Khách", title: "Thông tin khách", hint: "Lời chào riêng, theo dõi đơn" },
  { id: 3, short: "Gửi link", title: "Gửi link", hint: "Sao chép và gửi qua Zalo" },
]

interface JourneyStepperProps {
  step: JourneyStep
  /** Cho phép quay lại bước đã hoàn thành. */
  onStepClick: (step: JourneyStep) => void
}

export function JourneyStepper({ step, onStepClick }: JourneyStepperProps) {
  return (
    <nav aria-label="Các bước gửi bộ sưu tập riêng">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((s) => {
          const done = s.id < step
          const current = s.id === step
          return (
            <li key={s.id} className="min-w-0">
              <Button variant="ghost"
                type="button"
                disabled={!done}
                aria-current={current ? "step" : undefined}
                onClick={() => onStepClick(s.id)}
                className={cn("h-auto", "font-[inherit]", 
                  "group flex w-full flex-col items-center gap-1.5 text-center sm:flex-row sm:gap-3 sm:text-left rounded-xl border-b-2 px-2 py-3 transition-colors sm:px-3",
                  current && "border-primary",
                  done && "border-success hover:bg-surface-alt",
                  !current && !done && "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-bold",
                    current && "bg-primary text-white",
                    done && "bg-success text-white",
                    !current && !done && "bg-surface-alt text-text-muted",
                  )}
                >
                  {done ? <Check size={14} aria-hidden="true" /> : s.id}
                </span>
                <span className="w-full min-w-0 sm:w-auto">
                  <span className={cn("block truncate text-body-sm font-bold", current ? "text-text" : "text-text-muted")}>
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.title}</span>
                  </span>
                  <span className="hidden truncate text-caption text-text-muted md:block">{s.hint}</span>
                </span>
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
