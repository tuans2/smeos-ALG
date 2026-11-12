"use client"

import React from "react"
import { Phone } from "@/components/ui/icon-set/phone"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Star } from "@/components/ui/icon-set/star"
import { Power } from "@/components/ui/icon-set/power"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { PartnerView } from "@/modules/coordinator/use-cases/manage-partners"

export const TIER_LABELS: Record<string, { label: string; tone: "neutral" | "success" | "accent" }> = {
  STANDARD: { label: "Tiêu chuẩn", tone: "neutral" },
  PREFERRED: { label: "Ưu tiên", tone: "success" },
  VIP: { label: "VIP Đặc biệt", tone: "accent" },
}

export interface PartnerCardProps {
  partner: PartnerView
  onToggleStatus: (partner: PartnerView) => void
  onOpenSettlement?: ((partner: PartnerView) => void) | undefined
}

export function PartnerCard({ partner, onToggleStatus, onOpenSettlement }: PartnerCardProps) {
  const tierInfo = TIER_LABELS[partner.tier] || { label: partner.tier, tone: "neutral" as const }

  return (
    <Card
      className={`p-3.5 transition border ${
        partner.isActive ? "border-border bg-surface" : "border-border/60 bg-surface-alt/50 opacity-70"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-caption font-bold px-2 py-0.5 rounded bg-surface-raised border border-border text-text">
              {partner.code}
            </span>
            <h4 className="font-bold text-text text-body-sm">{partner.name}</h4>
            <Badge tone={tierInfo.tone} className="text-caption">
              {tierInfo.label}
            </Badge>
            {!partner.isActive && (
              <span className="text-caption font-semibold px-2 py-0.5 rounded-full bg-danger-bg text-danger">
                Tạm ngưng
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-text-muted">
            <span className="flex items-center gap-1">
              <Phone size={12} className="text-primary" />
              {partner.phone}
            </span>
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-primary" />
              {[partner.district, partner.province].filter(Boolean).join(", ") || "Chưa rõ khu vực"}
            </span>
            <span className="flex items-center gap-1">
              <Star size={12} className="text-warning fill-warning" />
              {Number(partner.rating || 5.0).toFixed(1)}
            </span>
            <span>
              Định mức: <strong>{partner.capacityDaily}</strong> đơn/ngày
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenSettlement && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenSettlement(partner)}
              className="text-caption gap-1.5 text-text-muted hover:text-primary hover:border-primary/30"
              title="Bảng kê tiền công và sổ quyết toán"
            >
              Bảng kê
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(partner)}
            className={`text-caption gap-1.5 ${
              partner.isActive
                ? "text-text-muted hover:text-danger hover:border-danger/30"
                : "text-success hover:border-success/30"
            }`}
          >
            <Power size={13} />
            {partner.isActive ? "Tạm ngưng" : "Kích hoạt"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
