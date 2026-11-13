"use client"

import React from "react"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { AiRequestItem } from "./analytics-types"

export interface AnalyticsExplainPhaseProps {
  loading: boolean
  aiRequests: AiRequestItem[] | null
  onBack: () => void
  onNextPhase: () => void
}

export function AnalyticsExplainPhase({
  loading,
  aiRequests,
  onBack,
  onNextPhase,
}: AnalyticsExplainPhaseProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div>
          <span className="text-body-sm text-text-muted font-bold">Diễn giải bằng AI</span>
          <h2 className="text-title-sm font-bold text-text">Phân tích nguyên nhân & Chỉ số bất thường</h2>
        </div>
        <Badge tone="neutral">Tham khảo — không ghi đè</Badge>
      </div>

      {loading ? (
        <Card className="p-5 bg-surface border border-border">
          <SkeletonBlock lines={3} label="Đang tải phân tích diễn giải AI..." />
        </Card>
      ) : aiRequests && aiRequests.length > 0 ? (
        <Card className="p-5 bg-surface border border-border flex flex-col gap-3">
          <div className="text-body-sm font-bold text-text">
            {aiRequests.length} yêu cầu AI — {aiRequests[0]!.capability_code}
          </div>
          <div className="text-caption text-text-muted leading-relaxed">
            Mô hình: <strong className="text-text">{aiRequests[0]!.model_key}</strong>. Kết quả: {aiRequests[0]!.outcome}.
            Chi phí: ${aiRequests[0]!.cost_usd.toFixed(4)}.
            Chất lượng: {aiRequests[0]!.quality_score ?? "Đạt chuẩn"}.
          </div>
          {aiRequests.length > 1 && (
            <div className="text-caption text-text-muted mt-1">
              + {aiRequests.length - 1} yêu cầu khác trong hệ thống
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-5 bg-surface border border-border text-center">
          <div className="text-body-sm font-bold text-text">Chưa có yêu cầu AI nào được ghi nhận</div>
          <div className="text-caption text-text-muted mt-1">
            Chưa phát hiện chỉ số bất thường nào cần can thiệp diễn giải.
          </div>
        </Card>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          Quay lại bảng chỉ số
        </Button>
        <Button onClick={onNextPhase} className="gap-2 shadow-xs">
          Xem đề xuất học phong cách <ChevronRight size={15} />
        </Button>
      </div>
    </div>
  )
}
