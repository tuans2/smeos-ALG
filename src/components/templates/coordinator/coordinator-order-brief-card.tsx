"use client"

import React from "react"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { User } from "@/components/ui/icon-set/user"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Flower2 } from "@/components/ui/icon-set/flower2"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { StructuredAddress } from "@/modules/products/domain/product-master-index"

export interface CoordinatorOrderBriefProps {
  orderCode: string
  stage: string
  stageLabel: string
  riskLevel: "NORMAL" | "ATTENTION" | "AT_RISK" | "CRITICAL"
  riskReason?: string | null | undefined
  customerName: string
  customerTier: string
  recipientName: string
  recipientPhone: string
  deliveryAddress: StructuredAddress | string
  deliveryTargetTime: string
  nextAction: string
  productTitle?: string | undefined
  sampleImageUrl?: string | null | undefined
  partnerName?: string | undefined
  hasMissingItems?: boolean | undefined
  onOpenDetail?: () => void
  onAdvanceStage?: () => void
  onOpenAssignModal?: () => void
  onOpenMissingInfo?: () => void
  onOpenProduction?: () => void
  onOpenQC?: () => void
  onOpenPOD?: () => void
  onOpenClosure?: () => void
}

export function CoordinatorOrderBriefCard({
  orderCode,
  stage,
  stageLabel,
  riskLevel,
  riskReason,
  customerName,
  customerTier,
  recipientName,
  recipientPhone,
  deliveryAddress,
  deliveryTargetTime,
  nextAction,
  productTitle,
  sampleImageUrl,
  partnerName,
  hasMissingItems,
  onOpenDetail,
  onAdvanceStage,
  onOpenAssignModal,
  onOpenMissingInfo,
  onOpenProduction,
  onOpenQC,
  onOpenPOD,
  onOpenClosure,
}: CoordinatorOrderBriefProps) {
  const riskTone =
    riskLevel === "CRITICAL"
      ? "danger"
      : riskLevel === "AT_RISK"
      ? "warning"
      : riskLevel === "ATTENTION"
      ? "neutral"
      : "success"

  return (
    <Card className="rounded-2xl border border-border bg-surface p-5 shadow-sm flex flex-col gap-4 hover:border-danger-border transition-colors">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded-md bg-surface-alt text-text text-caption font-black uppercase border border-border tracking-wider">
            BƯỚC 2 • TÓM TẮT ĐƠN
          </span>
          <span className="text-caption font-bold text-text-muted">ĐIỀU PHỐI ĐƠN</span>
          <span className="text-body font-extrabold text-text">#{orderCode}</span>
          <Badge tone={riskTone} className="font-bold text-caption">
            {stageLabel}
          </Badge>
          {partnerName && (
            <span className="px-2 py-0.5 rounded-full bg-info-bg text-info-text text-caption font-bold border border-info-border">
              🏪 {partnerName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-caption font-semibold text-danger-text bg-danger-bg px-2.5 py-1 rounded-full border border-danger/30">
          <Clock size={13} />
          <span>Hẹn giao: {deliveryTargetTime}</span>
        </div>
      </div>

      {riskLevel !== "NORMAL" && riskReason && (
        <div className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-warning-bg border border-warning-border text-warning-text text-caption font-medium">
          <div className="flex items-start gap-2">
            <AlertTriangle size={15} className="shrink-0 text-warning-text mt-0.5" />
            <span>{riskReason}</span>
          </div>
          {hasMissingItems && onOpenMissingInfo && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenMissingInfo}
              className="h-6 text-caption px-2 font-bold text-warning-text border-warning-border bg-warning-bg hover:bg-warning-border shrink-0"
            >
              Xem Phiếu Thiếu Tin
            </Button>
          )}
        </div>
      )}

      {/* Khối Ảnh Mẫu & Thông Tin Sản Phẩm Đầu Vào */}
      {(productTitle || sampleImageUrl) && (
        <div className="p-2.5 rounded-xl bg-surface-alt/70 border border-border/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {sampleImageUrl ? (
              <div className="w-12 h-12 rounded-lg border border-danger-border overflow-hidden shrink-0 relative bg-surface shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sampleImageUrl}
                  alt={productTitle || "Mẫu sản phẩm đầu vào"}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg border border-border bg-surface flex items-center justify-center shrink-0 text-text-muted">
                <Flower2 size={20} className="text-danger" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-caption font-bold text-danger-text bg-danger-bg border border-danger-border px-1.5 py-0.2 rounded shrink-0">
                  Mẫu Input
                </span>
                <span className="font-extrabold text-text text-caption truncate">
                  {productTitle || "Sản phẩm thiết kế"}
                </span>
              </div>
              <span className="text-caption text-text-muted mt-0.5 block truncate">
                Chuẩn đối chiếu AI QC & Thợ gia công
              </span>
            </div>
          </div>
          {onOpenDetail && (
            <Button variant="ghost"
              type="button"
              onClick={onOpenDetail}
              className="h-auto p-0 gap-0 text-caption font-bold text-danger-text hover:text-danger-text whitespace-nowrap shrink-0 hover:underline cursor-pointer"
            >
              Chi tiết →
            </Button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-caption">
        <div className="p-3 rounded-xl bg-surface-alt border border-border/60 flex flex-col gap-1.5">
          <div className="flex items-center gap-1 text-text-muted font-semibold">
            <User size={13} />
            <span>Khách đặt:</span>
            <span className="text-text font-bold">{customerName}</span>
            <span className="px-1.5 py-0.5 rounded bg-warning-bg text-warning-text text-caption font-bold">
              {customerTier}
            </span>
          </div>
          <div className="text-text-muted">
            Người nhận: <strong className="text-text">{recipientName}</strong> ({recipientPhone})
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-alt border border-border/60 flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-text-muted font-semibold">
              <MapPin size={13} className="text-danger-text" />
              <span>Địa chỉ giao hàng:</span>
            </div>
            {typeof deliveryAddress === "object" && deliveryAddress !== null && (
              <span className="text-caption font-bold text-danger-text bg-danger-bg px-1.5 py-0.2 rounded">
                Chuẩn 5 tầng
              </span>
            )}
          </div>
          <div className="text-text line-clamp-2 font-bold">
            {typeof deliveryAddress === "object" && deliveryAddress !== null
              ? deliveryAddress.street
              : deliveryAddress}
          </div>
          {typeof deliveryAddress === "object" && deliveryAddress !== null && (
            <div className="flex items-center gap-1 flex-wrap pt-0.5">
              <span className="px-1.5 py-0.2 rounded bg-danger-bg text-danger-text text-caption font-bold">
                {deliveryAddress.ward}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-info-bg text-info-text text-caption font-bold">
                {deliveryAddress.district}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-accent-bg text-accent-text text-caption font-bold">
                {deliveryAddress.city}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-dashed border-border">
        <div className="text-caption text-text-muted font-medium flex items-center gap-1.5">
          <span className="font-bold text-text">Hành động kế tiếp:</span>
          <span className="text-primary font-semibold">{nextAction}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick-action buttons for specific stages */}
          {(stage === "PLANNING" || stage === "ASSIGNING" || stage === "INTAKE") && onOpenAssignModal && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenAssignModal}
              className="text-caption h-7 px-2.5 font-bold border-info-border text-info-text bg-info-bg/70 hover:bg-info-bg"
            >
              ⚡ Phân công xưởng
            </Button>
          )}

          {stage === "IN_PRODUCTION" && onOpenProduction && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenProduction}
              className="text-caption h-7 px-2.5 font-bold border-warning-border text-warning-text bg-warning-bg/70 hover:bg-warning-bg"
            >
              🌸 Phiếu cắm hoa
            </Button>
          )}

          {stage === "QUALITY_CHECK" && onOpenQC && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenQC}
              className="text-caption h-7 px-2.5 font-bold border-accent-border text-accent-text bg-accent-bg/70 hover:bg-accent-bg"
            >
              🤖 Duyệt AI QC
            </Button>
          )}

          {stage === "DISPATCHING" && onOpenPOD && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenPOD}
              className="text-caption h-7 px-2.5 font-bold border-info-border text-info-text bg-info-bg/70 hover:bg-info-bg"
            >
              📦 Biên nhận POD
            </Button>
          )}

          {(stage === "DELIVERED" || stage === "COMPLETED") && onOpenClosure && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenClosure}
              className="text-caption h-7 px-2.5 font-bold border-success-border text-success-text bg-success-bg/70 hover:bg-success-bg"
            >
              ✅ Nghiệm thu
            </Button>
          )}

          {onOpenDetail && (
            <Button variant="outline" size="sm" onClick={onOpenDetail} className="h-7 text-caption font-bold">
              Chi tiết
            </Button>
          )}

          {onAdvanceStage && (
            <Button size="sm" onClick={onAdvanceStage} className="bg-danger hover:bg-danger-text text-white gap-1 h-7 text-caption font-bold">
              <span>Chuyển bước</span>
              <ArrowRight size={13} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
