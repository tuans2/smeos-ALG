"use client"

import * as React from "react"
import Link from "next/link"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Copy } from "@/components/ui/icon-set/copy"
import { Check } from "@/components/ui/icon-set/check"
import { FileCode } from "@/components/ui/icon-set/file-code"
import { Layers } from "@/components/ui/icon-set/layers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ScreenItem } from "@/modules/platform/infra/screen-scanner"

export interface ScreenCardProps {
  screen: ScreenItem
  onCopyRoute: (route: string) => void
  isCopied: boolean
}

export function ScreenCard({ screen, onCopyRoute, isCopied }: ScreenCardProps) {
  const tierColor =
    screen.tier === "STORE"
      ? "bg-success-bg text-success-text border-success/30"
      : screen.tier === "MOTHER"
        ? "bg-primary-muted text-primary border-primary/30"
        : screen.tier === "CHAIN"
          ? "bg-selected text-selected-text border-primary/30"
          : screen.tier === "PUBLIC"
            ? "bg-warning-bg text-warning-text border-warning/30"
            : "bg-surface-alt text-text-muted border-border"

  const statusBadge =
    screen.status === "CONTRACT_V2" ? (
      <Badge tone="success" className="text-caption">
        Contract v2
      </Badge>
    ) : screen.status === "CONTRACT_V1" ? (
      <Badge tone="warning" className="text-caption">
        Contract v1
      </Badge>
    ) : (
      <Badge tone="neutral" className="text-caption">
        Miễn trừ
      </Badge>
    )

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-md">
      <div className="space-y-3">
        {/* Header: Tier + Archetype + Status */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-caption font-semibold border ${tierColor}`}>
              {screen.tierLabel.split(" ")[0]}
            </span>
            <Badge tone="neutral" className="text-caption font-mono">
              Archetype {screen.archetype}
            </Badge>
          </div>
          {statusBadge}
        </div>

        {/* Title & Screen ID */}
        <div>
          <h3 className="text-body font-bold text-text group-hover:text-primary transition-colors line-clamp-1" title={screen.title}>
            {screen.title}
          </h3>
          <p className="text-caption font-mono text-text-muted mt-0.5">
            {screen.screenId}
          </p>
        </div>

        {/* Route Box with Copy */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-alt px-2.5 py-1.5 border border-border/60">
          <code className="text-caption font-mono text-text truncate max-w-[220px]" title={screen.route}>
            {screen.route}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onCopyRoute(screen.route)}
            title="Sao chép đường dẫn"
            aria-label={`Sao chép đường dẫn ${screen.route}`}
          >
            {isCopied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {screen.isDynamic && (
          <p className="text-caption text-warning-text flex items-center gap-1">
            <span>⚠️ Tuyến động có tham số (URL mẫu: {screen.sampleUrl})</span>
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-caption text-text-muted">
          <FileCode className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[140px]" title={screen.pagePath}>
            {screen.module}
          </span>
        </div>

        <a
          href={screen.sampleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-caption font-semibold"
        >
          <span>Mở trang</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
