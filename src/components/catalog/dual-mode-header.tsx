"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { Sparkles, SlidersHorizontal } from "@/components/ui/icons"

interface DualModeHeaderProps {
  mode: "auto" | "manual"
  onModeChange: (mode: "auto" | "manual") => void
  title?: string
  description?: string
}

export function DualModeHeader({
  mode,
  onModeChange,
  title = "Chọn phương thức thiết lập",
  description = "Bạn có thể chuyển đổi linh hoạt giữa AI tự động và tự thiết kế từng bước bất kỳ lúc nào.",
}: DualModeHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h2 className="text-title font-bold text-text">{title}</h2>
          <p className="text-body-sm text-text-muted mt-0.5">{description}</p>
        </div>
      </div>

      {/* 2 Lựa chọn cân bằng (Balanced Segmented Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Lựa chọn 1: Tự động bằng AI */}
        <Button variant="outline"
          type="button"
          onClick={() => onModeChange("auto")}
          className={`h-auto text-[length:inherit] justify-start font-[inherit] flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
            mode === "auto"
              ? "border-primary bg-primary-muted/20 ring-1 ring-primary shadow-xs hover:bg-primary-muted/20"
              : "border-border bg-surface hover:bg-surface-alt/60 hover:border-border-hover"
          }`}
        >
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              mode === "auto" ? "bg-primary text-surface" : "bg-primary-muted text-primary"
            }`}
          >
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body font-bold text-text">Tự động bằng AI</span>
              {mode === "auto" && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-surface text-caption font-bold">
                  Đang chọn
                </span>
              )}
            </div>
            <p className="text-caption text-text-muted mt-1 leading-relaxed">
              Chỉ cần đưa ảnh hoa, link video hoặc ghi chú text. AI sẽ phân tích và tự động điền sẵn toàn bộ các bước cho bạn.
            </p>
          </div>
        </Button>

        {/* Lựa chọn 2: Tự thiết kế từng bước */}
        <Button variant="outline"
          type="button"
          onClick={() => onModeChange("manual")}
          className={`h-auto text-[length:inherit] justify-start font-[inherit] flex items-start gap-3 p-4 rounded-xl border text-left transition-all cursor-pointer ${
            mode === "manual"
              ? "border-primary bg-primary-muted/20 ring-1 ring-primary shadow-xs hover:bg-primary-muted/20"
              : "border-border bg-surface hover:bg-surface-alt/60 hover:border-border-hover"
          }`}
        >
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
              mode === "manual" ? "bg-primary text-surface" : "bg-surface-alt text-text"
            }`}
          >
            <SlidersHorizontal className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-body font-bold text-text">Tự thiết kế từng bước</span>
              {mode === "manual" && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-surface text-caption font-bold">
                  Đang chọn
                </span>
              )}
            </div>
            <p className="text-caption text-text-muted mt-1 leading-relaxed">
              Chủ động chọn dịp lễ, lọc hoa từ kho, tự viết tiêu đề và cấu hình các section theo ý thích cá nhân.
            </p>
          </div>
        </Button>
      </div>
    </div>
  )
}
