"use client"

import React from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Store } from "@/components/ui/icon-set/store"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"
import { MapPin } from "@/components/ui/icon-set/map-pin"
import { Database } from "@/components/ui/icon-set/database"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import type { ChainStoreSummary } from "@/modules/field-platform/use-cases/get-chain-stores-data"

interface StoreCardProps {
  readonly store: ChainStoreSummary
  readonly onOpenStore: (store: ChainStoreSummary) => void
}

export function StoreCard({ store, onOpenStore }: StoreCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpenStore(store)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onOpenStore(store)
        }
      }}
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-border/80 bg-surface hover:border-primary/50 hover:shadow-md transition-all cursor-pointer text-left focus:outline-primary"
    >
      <div>
        {/* Header with store icon & status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors shadow-xs">
              <Store size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-title-sm text-text group-hover:text-primary transition-colors">
                {store.name}
              </h3>
              <span className="text-caption font-mono text-text-muted font-medium">
                Mã: {store.code}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <Badge tone={store.isActive ? "success" : "neutral"} className="text-caption">
              {store.isActive ? "Hoạt động" : "Tạm dừng"}
            </Badge>
            <span
              className={`text-caption font-bold px-1.5 py-0.5 rounded border ${
                store.isPartner
                  ? "bg-warning-bg text-warning-text border-warning-border"
                  : "bg-surface-alt text-text-muted border-border"
              }`}
            >
              {store.isPartner ? "Đối tác (DSA)" : "Trực thuộc"}
            </span>
          </div>
        </div>

        {/* Address */}
        <div className="flex items-center gap-1.5 text-caption text-text-muted mb-4 min-h-[1.25rem]">
          <MapPin size={13} className="shrink-0 text-text-muted/70" />
          <span className="truncate">{store.address ?? "Chưa cập nhật địa chỉ"}</span>
        </div>

        {/* Readiness Bar */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-caption font-semibold text-text-muted">
            <span>Độ sẵn sàng dữ liệu</span>
            <span className="text-primary font-bold">{store.readinessPercentage}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-alt overflow-hidden border border-border/50">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${store.readinessPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-caption font-medium text-text-muted">
          <Database size={13} className="text-primary" />
          <span>
            Thu thập: <strong className="text-text font-bold">{store.collectedFieldCount}</strong>/{store.totalFieldCount} trường
          </span>
        </div>

        <div className="flex items-center gap-1 text-caption font-bold text-primary group-hover:translate-x-0.5 transition-transform">
          <span>Xem dữ liệu</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </Card>
  )
}
