"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Check, Lock, ShieldCheck, Camera, Truck, FileCheck2 } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

export type SubcontractStepId = 1 | 2 | 3 | 4

export interface SubcontractStepMeta {
  id: SubcontractStepId
  number: number
  shortTitle: string
  fullTitle: string
  hint: string
}

export const SUBCONTRACT_STEPS: SubcontractStepMeta[] = [
  { id: 1, number: 1, shortTitle: "Nhận đơn", fullTitle: "Tiếp nhận & Chốt", hint: "Xác nhận nhận đơn" },
  { id: 2, number: 2, shortTitle: "Kiểm định QC", fullTitle: "Chế tác & QC", hint: "Tải ảnh thành phẩm" },
  { id: 3, number: 3, shortTitle: "Giao Shipper", fullTitle: "Bàn giao Shipper", hint: "Thông tin vận chuyển" },
  { id: 4, number: 4, shortTitle: "Đã giao", fullTitle: "Bằng chứng giao hàng", hint: "Nghiệm thu hoàn tất" },
]

export interface SubcontractStepDeadlinesMap {
  1?: string | null | undefined
  2?: number | null | undefined
  3?: number | null | undefined
  4?: number | null | undefined
}

interface SubcontractSpotlightStepperProps {
  activeStep: SubcontractStepId
  completedSteps: SubcontractStepId[]
  unlockedSteps: SubcontractStepId[]
  deadlines?: SubcontractStepDeadlinesMap | undefined
  onSelectStep: (step: SubcontractStepId) => void
}

export function SubcontractSpotlightStepper({
  activeStep,
  completedSteps,
  unlockedSteps,
  deadlines,
  onSelectStep,
}: SubcontractSpotlightStepperProps) {
  return (
    <nav aria-label="Tiến trình công đoạn gia công chuỗi" className="w-full">
      <ol className="grid grid-cols-4 gap-1 sm:gap-2">
        {SUBCONTRACT_STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id)
          const isActive = activeStep === step.id
          const isUnlocked = unlockedSteps.includes(step.id)

          return (
            <li key={step.id} className="min-w-0">
              <Button variant="outline"
                type="button"
                aria-current={isActive ? "step" : undefined}
                disabled={!isUnlocked && !isCompleted}
                onClick={() => onSelectStep(step.id)}
                className={cn("h-auto", "font-[inherit]", 
                  "group flex w-full flex-col items-center gap-1 text-center rounded-xl p-2 transition-all duration-200 border cursor-pointer",
                  isActive
                    ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/30"
                    : isCompleted
                    ? "bg-success/5 border-success/30 hover:bg-success/10 text-text"
                    : isUnlocked
                    ? "bg-surface-alt border-border hover:bg-surface text-text-muted"
                    : "bg-surface-alt/50 border-border/40 text-text-muted/60 opacity-60 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-black transition-transform group-hover:scale-105",
                    isActive
                      ? "bg-primary text-white ring-2 ring-primary/30 shadow-xs"
                      : isCompleted
                      ? "bg-success text-white"
                      : isUnlocked
                      ? "bg-surface-alt text-text border border-border"
                      : "bg-surface-alt text-text-muted/70 border border-border/40"
                  )}
                >
                  {isCompleted ? (
                    <Check size={14} className="stroke-[3]" aria-hidden="true" />
                  ) : !isUnlocked ? (
                    <Lock size={12} aria-hidden="true" />
                  ) : (
                    step.number
                  )}
                </div>

                <div className="w-full min-w-0">
                  <span
                    className={cn(
                      "block truncate text-caption font-bold leading-tight",
                      isActive
                        ? "text-primary-dark font-black"
                        : isCompleted
                        ? "text-success font-bold"
                        : "text-text-muted"
                    )}
                  >
                    {step.shortTitle}
                  </span>
                  {/* Mốc thời hạn ngắn gọn nếu có */}
                  {step.id > 1 && typeof deadlines?.[step.id] === "number" && (
                    <span
                      className={cn(
                        "block truncate text-caption font-medium leading-none mt-0.5",
                        isCompleted
                          ? "text-success/70"
                          : isActive
                          ? "text-primary/90 font-bold"
                          : "text-text-muted/70"
                      )}
                    >
                      {new Date(deadlines[step.id] as number + 7 * 3600_000)
                        .toISOString()
                        .substring(11, 16)}
                    </span>
                  )}
                </div>
              </Button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
