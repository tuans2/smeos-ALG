"use client"

import React from "react"
import { HelpCircle } from "@/components/ui/icon-set/help-circle"
import { Send } from "@/components/ui/icon-set/send"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface MissingInfoItem {
  field: string
  label: string
  reason: string
}

export interface MissingInfoRequestCardProps {
  orderCode: string
  salesPersonName: string
  missingItems: MissingInfoItem[]
  onSendToSales?: () => void
  onResolved?: () => void
}

export function MissingInfoRequestCard({
  orderCode,
  salesPersonName,
  missingItems,
  onSendToSales,
  onResolved,
}: MissingInfoRequestCardProps) {
  return (
    <Card className="rounded-2xl border border-warning-border bg-warning-bg/50 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle size={17} className="text-warning-text" />
          <span className="text-caption font-bold text-warning-text">YÊU CẦU BỔ SUNG THÔNG TIN</span>
          <Badge tone="warning" className="text-caption font-bold">
            Đơn #{orderCode}
          </Badge>
        </div>
        <div className="text-caption text-text-muted">
          Người phụ trách Sales: <strong className="text-text">{salesPersonName}</strong>
        </div>
      </div>

      <div className="text-caption flex flex-col gap-2">
        <span className="font-bold text-text">Các trường thông tin còn thiếu cần Sales bổ sung gấp:</span>
        <div className="space-y-2">
          {missingItems.map((item, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-surface border border-warning-border flex flex-col gap-0.5">
              <div className="font-extrabold text-warning-text flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-warning-text" />
                <span>{item.label} ({item.field})</span>
              </div>
              <p className="text-text-muted text-caption">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-dashed border-warning-border">
        {onResolved && (
          <Button variant="outline" size="sm" onClick={onResolved} className="h-8 text-caption gap-1">
            <CheckCircle2 size={13} />
            <span>Đã đủ thông tin</span>
          </Button>
        )}
        {onSendToSales && (
          <Button size="sm" onClick={onSendToSales} className="bg-warning hover:bg-warning/90 text-text h-8 text-caption gap-1 font-bold">
            <Send size={13} />
            <span>Gửi Yêu Cầu Cho Sales Qua Zalo / Chat</span>
          </Button>
        )}
      </div>
    </Card>
  )
}
