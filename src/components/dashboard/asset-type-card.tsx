"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { ArrowUpRight } from "@/components/ui/icon-set/arrow-up-right"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Button } from "@/components/ui/button"
import { InfoTip } from "@/components/ui/info-tip"
import {
  type AssetTypeDefinition,
  getAssetHref,
  getManualInputs,
  readinessOf,
  READINESS_DISPLAY,
  USAGE_DESTINATION_DISPLAY,
} from "@/modules/marketing-center/domain/asset-type"
import type { ToolDefinition } from "@/modules/toolkit/domain/toolkit-catalog"

interface AssetTypeCardProps {
  asset: AssetTypeDefinition
  tool?: ToolDefinition | null | undefined
  isDev: boolean
}

export function AssetTypeCard({ asset, tool, isDev }: AssetTypeCardProps) {
  const router = useRouter()
  const readiness = readinessOf(asset, tool)
  const isReady = readiness === "READY"
  const href = getAssetHref(asset, tool)
  const readinessBadge = READINESS_DISPLAY[readiness]
  const manualInputs = getManualInputs(asset.inputs)

  const handleCreate = () => {
    if (isReady && href) {
      router.push(href as never)
    }
  }

  return (
    <div
      className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-surface shadow-sm ring-1 transition-all ${
        isReady
          ? "ring-border/70 hover:ring-primary hover:shadow-md"
          : "ring-border/40 opacity-80 hover:opacity-100"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {asset.destinations.map((dest) => {
              const display = USAGE_DESTINATION_DISPLAY[dest]
              return (
                <span
                  key={dest}
                  title={display.description}
                  className="px-1.5 py-0.5 rounded text-caption font-semibold tracking-wide bg-surface-alt text-text-muted border border-border/60"
                >
                  {display.short}
                </span>
              )
            })}
          </div>

          <div className="flex items-center gap-1">
            {isDev && (
              <span
                className={`px-1.5 py-0.5 rounded text-caption font-medium border ${
                  readiness === "READY"
                    ? "bg-success-bg text-success border-success-border"
                    : readiness === "EXTEND"
                      ? "bg-warning-bg text-warning-text border-warning-border"
                      : "bg-surface-alt text-text-muted border-border"
                }`}
              >
                {readinessBadge.label}
              </span>
            )}
            <InfoTip label={asset.name} side="bottom">
              {asset.purpose}
            </InfoTip>
          </div>
        </div>

        <h4 className="text-body-sm sm:text-title-sm font-bold text-text leading-snug">
          {asset.name}
        </h4>

        <div className="mt-2 text-caption text-text-muted">
          {manualInputs.length > 0 ? (
            <span>
              <span className="font-semibold text-text-secondary">Cần:</span>{" "}
              {manualInputs.map((i) => i.label).join(", ")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-primary">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              Tự động điền hoàn toàn
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-caption text-text-muted">
          {asset.outputs.join(" · ")}
        </span>

        {isReady && href ? (
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            className="inline-flex items-center gap-1 text-caption font-bold"
          >
            Tạo
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Button>
        ) : (
          <span className="text-caption text-text-muted italic">
            {readiness === "EXTEND" ? "Đang mở rộng" : "Sắp ra mắt"}
          </span>
        )}
      </div>
    </div>
  )
}
