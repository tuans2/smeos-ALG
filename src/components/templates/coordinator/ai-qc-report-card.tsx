"use client"

import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Check } from "@/components/ui/icon-set/check"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface AIQCReportCardProps {
  orderCode: string
  qcStatus: "PENDING" | "PASSED" | "REJECTED" | "REWORK_REQUESTED"
  aiScore?: number | null
  aiCritique?: string | null
  finishedImageUrls?: string[]
  checklist?: {
    flowerMatchScore: number
    colorToneMatch: boolean
    wrappingMatch: boolean
    ribbonMatch: boolean
    cardMessageAccurate: boolean
  } | null
  reworkInstructions?: string | null
  onApprove?: () => void
  onRequestRework?: () => void
}

export function AIQCReportCard({
  orderCode,
  qcStatus,
  aiScore = null,
  aiCritique,
  finishedImageUrls = [],
  checklist,
  reworkInstructions,
  onApprove,
  onRequestRework,
}: AIQCReportCardProps) {
  const isPassed = qcStatus === "PASSED"
  const isRework = qcStatus === "REWORK_REQUESTED"

  return (
    <Card className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
        <div>
          <div className="text-caption font-bold uppercase tracking-wider text-text-muted">
            Kiểm Định Chất Lượng Thành Phẩm (T14 / T15)
          </div>
          <h3 className="text-title-sm font-extrabold text-text">
            Báo cáo AI QC Đơn #{orderCode}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            tone={isPassed ? "success" : isRework ? "warning" : "neutral"}
            className="font-bold px-3 py-1 text-caption"
          >
            {isPassed ? "ĐẠT CHUẨN (PASS)" : isRework ? "YÊU CẦU LÀM LẠI" : "CHỜ KIỂM ĐỊNH"}
          </Badge>
          {aiScore !== null && aiScore !== undefined && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-success-bg border border-success-border text-success-text font-extrabold text-caption">
              <Sparkles size={13} className="text-success-text" />
              <span>{aiScore}/100 Điểm</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3">
          <span className="text-caption font-bold text-text-muted">ẢNH THÀNH PHẨM (THỢ GỬI)</span>
          {finishedImageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {finishedImageUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border bg-surface-alt">
                  <img src={url} alt={`Thành phẩm ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-xl border border-dashed border-border text-center text-caption text-text-muted">
              Chưa có ảnh thành phẩm từ thợ
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <span className="text-caption font-bold text-text-muted block mb-2">TIÊU CHÍ ĐỐI CHIẾU MẪU CHUẨN</span>
            <div className="rounded-xl border border-border bg-surface-alt p-3.5 space-y-2.5 text-caption">
              <div className="flex items-center justify-between">
                <span className="text-text font-medium">Khớp nguyên phụ liệu & số lượng định mức:</span>
                <span className="font-bold text-success-text flex items-center gap-1">
                  <Check size={14} />
                  {checklist?.flowerMatchScore || 95}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text font-medium">Đúng tone màu & phong cách:</span>
                <span className="font-bold text-success-text flex items-center gap-1">
                  <Check size={14} />
                  {checklist?.colorToneMatch !== false ? "Đạt" : "Lệch tone"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text font-medium">Đúng quy cách đóng gói & phụ kiện:</span>
                <span className="font-bold text-success-text flex items-center gap-1">
                  <Check size={14} />
                  {checklist?.wrappingMatch !== false ? "Đạt" : "Sai loại giấy"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text font-medium">Thiệp chúc mừng đầy đủ, chính xác:</span>
                <span className="font-bold text-success-text flex items-center gap-1">
                  <Check size={14} />
                  {checklist?.cardMessageAccurate !== false ? "Đạt" : "Chưa có thiệp"}
                </span>
              </div>
            </div>
          </div>

          {aiCritique && (
            <div className="p-3.5 rounded-xl bg-surface-alt border border-border text-caption">
              <span className="font-bold text-text block mb-1">🤖 Đánh giá của AI Vision:</span>
              <p className="text-text-muted leading-relaxed">{aiCritique}</p>
            </div>
          )}

          {reworkInstructions && (
            <div className="p-3.5 rounded-xl bg-warning-bg border border-warning-border text-caption text-warning-text">
              <span className="font-bold block mb-1 flex items-center gap-1 text-warning-text">
                <AlertTriangle size={14} className="text-warning-text" />
                Hướng dẫn chỉnh sửa / làm lại:
              </span>
              <p>{reworkInstructions}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-3 border-t border-dashed border-border">
        {onRequestRework && (
          <Button variant="outline" size="sm" onClick={onRequestRework} className="gap-1.5 text-warning-text border-warning-border hover:bg-warning-bg">
            <RotateCcw size={14} />
            <span>Yêu cầu sửa / Làm lại</span>
          </Button>
        )}
        {onApprove && (
          <Button size="sm" onClick={onApprove} className="bg-success hover:bg-success-text text-white gap-1.5 font-bold">
            <CheckCircle2 size={15} />
            <span>Chốt Duyệt QC & Bàn Giao Shipper</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
