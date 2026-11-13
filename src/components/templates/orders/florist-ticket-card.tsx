"use client"

import React from "react"
import { Printer } from "@/components/ui/icon-set/printer"
import { CheckSquare } from "@/components/ui/icon-set/check-square"
import { Clock } from "@/components/ui/icon-set/clock"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n"

export interface FloristFlowerItem {
  flowerName: string
  quantity: number
  unit: string
  color: string
}

export interface FloristTicketCardProps {
  orderCode: string
  productName: string
  sampleImageUrl?: string | undefined
  deadlineTime: string
  floristName?: string | undefined
  items: FloristFlowerItem[]
  wrapStyle: string
  notes?: string | undefined
  onPrint?: () => void
  onComplete?: () => void
}

/**
 * FloristTicketCard (Phiếu gia công cho thợ xưởng M09)
 */
export function FloristTicketCard({
  orderCode,
  productName,
  sampleImageUrl,
  deadlineTime,
  floristName = "Chưa nhận thợ",
  items,
  wrapStyle,
  notes,
  onPrint,
  onComplete,
}: FloristTicketCardProps) {
  const { ti } = useI18n()
  const makerTitle = ti("makerTitle") || "Thợ phụ trách"
  const makerAction = ti("makerAction") || "Gia công & Lên mẫu"
  const recipeTitle = ti("productRecipe") || "Định mức vật tư bắt buộc"

  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-caption font-semibold text-text-muted">Lệnh sản xuất: {makerAction} (Xưởng)</div>
          <div className="text-title font-extrabold text-text">Đơn #{orderCode}: {productName}</div>
        </div>
        <Badge tone="danger" className="gap-1 font-bold">
          <Clock size={12} />
          Hạn giao: {deadlineTime}
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {sampleImageUrl && (
          <div className="relative aspect-square w-32 h-32 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-alt">
            <img src={sampleImageUrl} alt="Ảnh mẫu sản phẩm" className="h-full w-full object-cover" />
            <div className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-caption font-bold text-white">
              Ảnh mẫu
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col gap-2">
          <div className="text-caption text-text-muted">
            {makerTitle}: <span className="font-bold text-text">{floristName}</span> • Quy cách: <span className="font-bold text-text">{wrapStyle}</span>
          </div>

          <div className="rounded-lg border border-border bg-surface-alt/40 p-2.5">
            <div className="text-caption font-bold text-text mb-1.5">{recipeTitle}:</div>
            <div className="grid grid-cols-2 gap-1.5 text-caption">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center justify-between text-text">
                  <span>• {it.flowerName} ({it.color})</span>
                  <span className="font-bold text-primary">{it.quantity} {it.unit}</span>
                </div>
              ))}
            </div>
          </div>

          {notes && (
            <div className="rounded bg-warning-bg border border-warning/25 p-2 text-caption text-warning-text font-medium">
              Lưu ý khách: {notes}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        {onPrint && (
          <Button variant="secondary" size="sm" onClick={onPrint} className="gap-1.5">
            <Printer size={14} />
            In lệnh {makerTitle.toLowerCase()}
          </Button>
        )}
        {onComplete && (
          <Button size="sm" onClick={onComplete} className="gap-1.5">
            <CheckSquare size={14} />
            Báo hoàn thành
          </Button>
        )}
      </div>
    </Card>
  )
}
