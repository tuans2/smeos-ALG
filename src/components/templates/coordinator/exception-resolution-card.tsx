"use client"

import React from "react"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Clock } from "@/components/ui/icon-set/clock"
import { Wrench } from "@/components/ui/icon-set/wrench"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface ExceptionResolutionCardProps {
  orderCode: string
  exceptionCode: string
  type: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  description: string
  resolutionPlan?: string | null | undefined
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CANCELLED"
  reportedAt: string
  onResolve?: () => void
}

export function ExceptionResolutionCard({
  orderCode,
  exceptionCode,
  type,
  severity,
  description,
  resolutionPlan,
  status,
  reportedAt,
  onResolve,
}: ExceptionResolutionCardProps) {
  const isResolved = status === "RESOLVED"
  const tone = severity === "CRITICAL" ? "danger" : severity === "HIGH" ? "warning" : "neutral"

  return (
    <Card className="rounded-2xl border border-danger-border bg-danger-bg/40 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-danger-text" />
          <span className="text-caption font-bold text-danger-text">SỰ CỐ #{exceptionCode} (ĐƠN #{orderCode})</span>
          <Badge tone={tone} className="text-caption font-extrabold">
            {severity}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-caption text-text-muted">
          <Clock size={12} />
          <span>Báo lúc: {reportedAt}</span>
        </div>
      </div>

      <div className="text-caption">
        <div className="font-bold text-text mb-0.5">Loại sự cố: <span className="text-danger-text">{type}</span></div>
        <p className="text-text-muted leading-relaxed bg-surface p-3 rounded-xl border border-border">
          {description}
        </p>
      </div>

      {resolutionPlan && (
        <div className="p-3 rounded-xl bg-surface border border-success-border text-caption">
          <div className="font-bold text-success-text flex items-center gap-1 mb-1">
            <Wrench size={13} className="text-success-text" />
            <span>Phương án xử lý đề xuất:</span>
          </div>
          <p className="text-text-muted">{resolutionPlan}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-dashed border-danger-border">
        <Badge tone={isResolved ? "success" : "warning"} className="text-caption">
          {isResolved ? "ĐÃ XỬ LÝ XONG" : "ĐANG CHỜ ĐIỀU PHỐI XỬ LÝ"}
        </Badge>
        {!isResolved && onResolve && (
          <Button size="sm" onClick={onResolve} className="bg-success hover:bg-success-text text-white gap-1 text-caption">
            <CheckCircle2 size={13} />
            <span>Chốt Xử Lý & Tiếp Tục Đơn</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
