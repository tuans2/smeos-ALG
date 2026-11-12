"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import React from "react"
import { MapPin, Star, Layers } from "@/components/ui/icons"
const AREA_LABEL: Record<string, string> = {
  WARD: "Cùng phường",
  DISTRICT: "Cùng quận",
  PROVINCE: "Cùng tỉnh",
}

function proximityLabel(branch: DispatchedCandidateBranch): string {
  if (branch.distanceKm !== null) return branch.distanceKm > 0 ? `${branch.distanceKm} km` : "Tại chỗ"
  return (branch.areaMatch && AREA_LABEL[branch.areaMatch]) || "Chưa rõ khoảng cách"
}

export interface DispatchedCandidateBranch {
  branchId: string
  branchName: string
  /** null = chưa xác định được vị trí người nhận hoặc chi nhánh */
  distanceKm: number | null
  /** Mức khớp khu vực khi không có km: cùng phường / cùng quận / cùng tỉnh */
  areaMatch?: "WARD" | "DISTRICT" | "PROVINCE" | "OTHER_PROVINCE" | "UNKNOWN" | null
  qualityScore: number
  activeJobsCount: number
  totalScore?: number
  rank: number
  channels?: {
    hasTelegram?: boolean
    telegramLinked?: boolean
    hasZalo?: boolean
    phone?: string | null
  }
}

export interface ChainBranchCardProps {
  branch: DispatchedCandidateBranch
  isSelected: boolean
  onToggle: (branchId: string) => void
}

export function ChainBranchCard({ branch, isSelected, onToggle }: ChainBranchCardProps) {
  return (
    <Button variant="outline"
      type="button"
      onClick={() => onToggle(branch.branchId)}
      className={`h-auto font-[inherit] p-2.5 rounded-xl border text-caption text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
        isSelected
          ? "border-primary bg-surface shadow-xs hover:bg-surface"
          : "border-border/70 bg-surface/60 opacity-60 hover:opacity-100 hover:bg-surface/60"
      }`}
    >
      <div className="flex items-start justify-between gap-1.5 w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-extrabold text-caption text-text truncate">
              {branch.branchName}
            </span>
            {branch.rank <= 3 && (
              <span className="text-caption font-bold px-1 rounded bg-warning/10 text-warning-text">
                #{branch.rank}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-caption text-text-muted mt-0.5">
            <span className="flex items-center gap-0.5">
              <MapPin size={10} className="text-primary" />
              <strong>{proximityLabel(branch)}</strong>
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Star size={10} className="text-warning-text" />
              {branch.qualityScore}/100
            </span>
            <span>·</span>
            <span className="flex items-center gap-0.5">
              <Layers size={10} />
              {branch.activeJobsCount} đơn
            </span>
          </div>
        </div>

        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(branch.branchId)}
          className="rounded border-border text-primary focus:ring-primary h-4 w-4 shrink-0 mt-0.5"
        />
      </div>

      <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-caption w-full">
        <div className="flex items-center gap-1">
          {branch.channels?.hasTelegram && branch.channels.telegramLinked !== false && (
            <span className="px-1 py-0.5 rounded bg-info/10 text-info font-bold">
              Telegram riêng
            </span>
          )}
          {branch.channels?.hasTelegram && branch.channels.telegramLinked === false && (
            <span className="px-1 py-0.5 rounded bg-warning/10 text-warning-text font-bold" title="Gửi mã liên kết vào nhóm rồi bấm Quét Chat ID mới trong Cài đặt">
              Telegram chưa liên kết
            </span>
          )}
          {branch.channels?.hasZalo && (
            <span className="px-1 py-0.5 rounded bg-primary/10 text-primary-dark font-bold">
              Zalo
            </span>
          )}
        </div>
        <span className="text-text-muted font-mono">{branch.channels?.phone || "—"}</span>
      </div>
    </Button>
  )
}
