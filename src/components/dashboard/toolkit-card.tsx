"use client"

import { Button } from "@/components/ui/button"
import React from "react"
import { useRouter } from "next/navigation"
import type { ToolDefinition, ToolStatus } from "@/modules/toolkit/domain/toolkit-catalog"
import { InfoTip } from "@/components/ui/info-tip"
import { IconTile, type IconTone } from "@/components/ui/app-icon"
import { toolShortName } from "@/modules/toolkit/domain/tool-short-names"
import { STATUS_DISPLAY } from "@/modules/toolkit/domain/toolkit-catalog"

// ── Status badge styling ───────────────────────────────────────────

const STATUS_STYLE: Record<ToolStatus, string> = {
  DONE: "bg-success-bg text-success border-success-border",
  IN_PROGRESS: "bg-warning-bg text-warning-text border-warning-border",
  FOUNDATION: "bg-info-bg text-info border-info-border",
  PLANNED: "bg-surface-alt text-text-muted border-border",
}

const PROGRESS_BAR_STYLE: Record<ToolStatus, string> = {
  DONE: "bg-success",
  IN_PROGRESS: "bg-warning",
  FOUNDATION: "bg-info",
  PLANNED: "bg-border",
}

// ── ToolCard ───────────────────────────────────────────────────────

interface ToolCardProps {
  tool: ToolDefinition
  isDev: boolean
  /** Màu nhóm của bước chứa công cụ */
  tone?: IconTone
}

export function ToolCard({ tool, isDev, tone = "plum" }: ToolCardProps) {
  const router = useRouter()

  const isClickable = tool.href !== null
  const statusInfo = STATUS_DISPLAY[tool.status]

  const handleClick = () => {
    if (isClickable && tool.href) {
      router.push(tool.href as never)
    }
  }

  // Icon lớn + tên ngắn; mô tả dài và ghi chú tiến độ nằm trong "?" (thử phong cách thoáng).
  // Nút phủ cả thẻ bằng ::after để InfoTip không bị lồng nút trong nút.
  const shortName = toolShortName(tool)
  const detail = shortName === tool.name ? tool.description : `${tool.name}: ${tool.description}`
  const tipText = isDev && tool.statusNote ? `${detail} — ${tool.statusNote}` : detail

  return (
    <div
      className={`group relative flex flex-col items-center text-center p-4 pt-6 sm:p-6 rounded-2xl bg-surface shadow-sm ring-1 transition-all ${
        isClickable ? "ring-border/60 hover:ring-primary hover:shadow-md" : "ring-border/40"
      }`}
    >
      <InfoTip label={shortName} className="absolute top-1 right-1 sm:top-3 sm:right-3 m-0">
        {tipText}
      </InfoTip>
      {isDev && (
        <span
          className={`absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-caption font-semibold border ${STATUS_STYLE[tool.status]}`}
        >
          {statusInfo.emoji} {statusInfo.label}
        </span>
      )}

      <IconTile
        name={tool.icon}
        tone={tone}
        className={`mb-3 sm:mb-4 sm:mt-4 transition-transform ${isClickable ? "group-hover:scale-105" : "grayscale opacity-60"}`}
      />

      <h3 className={`text-body-sm sm:text-title-sm font-bold leading-snug ${isClickable ? "text-text group-hover:text-primary" : "text-text-muted"}`}>
        {isClickable ? (
          <Button variant="ghost"
            type="button"
            onClick={handleClick}
            className="text-[length:inherit] h-auto p-0 font-[inherit] gap-0 after:absolute after:inset-0 after:rounded-2xl after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring cursor-pointer transition-colors"
          >
            {shortName}
          </Button>
        ) : (
          shortName
        )}
      </h3>
      {!isClickable && <span className="mt-1 text-caption text-text-muted">Sắp có</span>}

      {isDev && (
        <div className="w-full mt-4 space-y-1">
          <div className="w-full h-1.5 rounded-full bg-surface-alt overflow-hidden">
            <div
              className={`h-full rounded-full ${PROGRESS_BAR_STYLE[tool.status]}`}
              style={{ width: `${tool.progress}%` }}
            />
          </div>
          <span className="text-caption text-text-muted">{tool.progress}%</span>
        </div>
      )}
    </div>
  )
}
