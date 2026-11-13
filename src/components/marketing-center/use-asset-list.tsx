"use client"

import React, { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Check } from "@/components/ui/icon-set/check"
import { Copy } from "@/components/ui/icon-set/copy"
import { Pause } from "@/components/ui/icon-set/pause"
import { Play } from "@/components/ui/icon-set/play"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { formatDate } from "@/lib/i18n/formatters"
import type { AssetUsage } from "@/modules/marketing-center/domain/asset-usage"
import { getCtaDefinition } from "@/modules/marketing-center/domain/cta-registry"

export interface UseAssetListProps {
  usages: readonly AssetUsage[]
  onToggleStatus?: (id: string, newStatus: "ACTIVE" | "PAUSED") => Promise<void>
  onOpenQr?: (usage: AssetUsage) => void
}

const DESTINATION_LABELS: Record<string, string> = {
  PROMOTION: "Quảng bá",
  SALES: "Bán hàng",
  CARE: "Chăm sóc",
  PRINT: "Ấn phẩm & In",
  OTHER: "Khác",
}

export function UseAssetList({ usages, onToggleStatus, onOpenQr }: UseAssetListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyLink = (usage: AssetUsage) => {
    if (!usage.shortLinkId) return
    const url = `${window.location.origin}/l/${usage.shortLinkId}`
    navigator.clipboard?.writeText(url)
    setCopiedId(usage.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (usages.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted">
        <p className="text-body-sm font-medium text-text">Chưa có nơi dùng nào</p>
        <p className="mt-1 text-caption text-text-muted">
          Hãy tạo liên kết hoặc mã QR để đưa tư liệu này đến khách hàng và đo lường hiệu quả.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {usages.map((u) => {
        const cta = getCtaDefinition(u.ctaCode)
        const isPaused = u.status === "PAUSED"
        const destLabel = DESTINATION_LABELS[u.destination] ?? u.destination

        return (
          <Card key={u.id} className="p-3.5 flex flex-col gap-2.5 bg-surface border-border">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-text text-body-sm truncate">{u.title}</span>
                  <Badge tone="neutral" className="text-caption">
                    {destLabel}
                  </Badge>
                  {isPaused && (
                    <Badge tone="danger" className="text-caption">
                      Đã tạm dừng
                    </Badge>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2 text-caption text-text-muted">
                  <span>CTA: {cta?.label ?? u.ctaCode}</span>
                  <span>•</span>
                  <span>{formatDate(u.createdAt.toString())}</span>
                </div>
              </div>

              {onToggleStatus && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-caption text-text-muted"
                  onClick={() => onToggleStatus(u.id, isPaused ? "ACTIVE" : "PAUSED")}
                >
                  {isPaused ? <Play size={13} className="mr-1" /> : <Pause size={13} className="mr-1" />}
                  {isPaused ? "Bật lại" : "Tạm dừng"}
                </Button>
              )}
            </div>

            {u.shortLinkId && (
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                <div className="flex items-center gap-1.5 min-w-0">
                  <code className="text-caption bg-surface-alt px-1.5 py-0.5 rounded text-text font-mono truncate">
                    /l/{u.shortLinkId.slice(0, 8)}...
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-caption"
                    onClick={() => handleCopyLink(u)}
                  >
                    {copiedId === u.id ? <Check size={11} className="mr-1 text-success" /> : <Copy size={11} className="mr-1" />}
                    {copiedId === u.id ? "Đã chép" : "Sao chép link"}
                  </Button>
                </div>

                {onOpenQr && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-caption text-text"
                    onClick={() => onOpenQr(u)}
                  >
                    <QrCode size={12} className="mr-1" />
                    Mã QR
                  </Button>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

