"use client"

import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Circle } from "@/components/ui/icon-set/circle"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"

interface OnboardingStep {
  id: string
  title: string
  completed: boolean
  route: string
}

export function OnboardingProgressBar() {
  const steps: OnboardingStep[] = [
    { id: "s1", title: "Duyệt định lượng thành phần", completed: true, route: "/tai-anh" },
    { id: "s2", title: "Cài giá sàn & markup", completed: true, route: "/san-pham" },
    { id: "s3", title: "Dựng video 9:16", completed: true, route: "/video" },
    { id: "s4", title: "Tải mã QR E-Catalog", completed: true, route: "/catalog" },
    { id: "s5", title: "Kích hoạt kênh Chat AI", completed: true, route: "/hoi-thoai/kenh-tich-hop" },
    { id: "s6", title: "Nạp khách & ngày kỷ niệm", completed: true, route: "/khach-hang" },
    { id: "s7", title: "In phiếu xưởng ẩn giá", completed: true, route: "/don-hang" },
  ]

  const completedCount = steps.filter((s) => s.completed).length
  const percent = Math.round((completedCount / steps.length) * 100)

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-success/15 text-success">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-body-sm font-extrabold text-text flex items-center gap-2">
              Tiến Độ Khởi Tạo Dữ Liệu Cửa Hàng (Commercial-Ready)
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-caption font-bold text-success">
                100% Sẵn Sàng
              </span>
            </div>
            <div className="text-caption text-text-muted">
              Đã hoàn thành {completedCount}/{steps.length} tiêu chuẩn nhập liệu cốt lõi của ALG
            </div>
          </div>
        </div>

        <div className="text-right">
          <span className="text-title font-black text-success">{percent}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className="h-full bg-success transition-all duration-500 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 7 Checkpoints */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
        {steps.map((step) => (
          <div
            key={step.id}
            className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-surface-alt/50 p-2 text-caption font-medium"
          >
            {step.completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-text-muted shrink-0" />
            )}
            <span className="truncate text-text font-semibold">{step.title}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
