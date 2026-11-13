"use client"

import React from "react"
import { Check } from "@/components/ui/icon-set/check"
import { TrendingUp } from "@/components/ui/icon-set/trending-up"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { SkeletonBlock } from "@/components/ui/skeleton"

export interface AnalyticsLearningPhaseProps {
  phase: "learning" | "saved"
  loading: boolean
  learningFields: { key: string; label: string; value: string; editable: boolean }[] | null
  policyLoading: boolean
  canApprove: boolean
  onBack: () => void
  onApprove: () => void
  onReset: () => void
}

export function AnalyticsLearningPhase({
  phase,
  loading,
  learningFields,
  policyLoading,
  canApprove,
  onBack,
  onApprove,
  onReset,
}: AnalyticsLearningPhaseProps) {
  if (phase === "saved") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 gap-5 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-success/15 text-success">
          <Check size={32} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-title-sm font-extrabold text-text">Hồ sơ phong cách đã cập nhật</h2>
          <p className="text-caption text-text-muted mt-1 max-w-sm">
            Các lượt sinh nội dung và ảnh tiếp theo sẽ tự động áp dụng hồ sơ phong cách mới này.
          </p>
        </div>
        <Button variant="outline" onClick={onReset} className="shadow-xs">
          Về bảng chỉ số
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center py-2">
        <div className="flex items-center justify-center mb-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <TrendingUp size={32} />
          </div>
        </div>
        <h2 className="text-title-sm font-extrabold text-text">Vòng học phong cách thương hiệu</h2>
        <p className="text-caption text-text-muted mt-0.5">Tự động tổng hợp sau mỗi chu kỳ chiến dịch tiếp thị</p>
      </div>

      {loading ? (
        <Card className="p-5 bg-surface border border-border">
          <SkeletonBlock lines={3} label="Đang tải nhật ký học phong cách..." />
        </Card>
      ) : learningFields ? (
        <Card className="p-5 bg-surface border border-border flex flex-col gap-3">
          {learningFields.map((f) => (
            <div
              key={f.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-2 border-b border-border/50 last:border-none"
            >
              <span className="text-caption font-semibold text-text-muted">{f.label}:</span>
              <span className={`text-caption ${f.editable ? "font-bold text-primary" : "text-text"}`}>
                {f.value}
              </span>
            </div>
          ))}
        </Card>
      ) : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Quay lại
        </Button>
        {canApprove && (
          <Button onClick={onApprove} disabled={policyLoading} className="shadow-xs font-bold">
            {policyLoading ? "Đang duyệt..." : "Duyệt áp dụng (learning.profile.manage)"}
          </Button>
        )}
      </div>
    </div>
  )
}
