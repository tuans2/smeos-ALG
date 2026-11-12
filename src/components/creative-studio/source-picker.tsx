/**
 * SourcePicker — Chọn nguồn ảnh đầu vào cho M04b
 *
 * Radio group: "Master đã duyệt" vs "Skip — Dùng ảnh gốc"
 * Khi chọn Skip: Dropdown ảnh ORIGINAL + nút "Duyệt nhanh → Tạo Master"
 */

"use client"

import { useState } from "react"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Loader2 } from "@/components/ui/icon-set/loader2"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { AssetItem, MasterItem } from "./types"

type SourceMode = "master" | "skip"

interface SourcePickerProps {
  /** Danh sách Master Image đã duyệt */
  masters: MasterItem[]
  selectedMasterId: string
  onSelectMaster: (id: string) => void

  /** Danh sách ảnh ORIGINAL (cho flow Skip) */
  assets: AssetItem[]

  /** Callback promote ORIGINAL → MASTER 1-chạm */
  onPromoteToMaster: (assetId: string) => Promise<void>

  /** Callback khi user muốn sang Khu vực A */
  onGoToOptimize: () => void

  /** Loading states */
  loadingMasters: boolean
  loadingAssets: boolean

  /** Có năng lực I2 (duyệt) không */
  canApprove: boolean
}

export function SourcePicker({
  masters,
  selectedMasterId,
  onSelectMaster,
  assets,
  onPromoteToMaster,
  onGoToOptimize,
  loadingMasters,
  loadingAssets,
  canApprove,
}: SourcePickerProps) {
  const [mode, setMode] = useState<SourceMode>(masters.length > 0 ? "master" : "skip")
  const [selectedOriginalId, setSelectedOriginalId] = useState<string>(assets[0]?.id ?? "")
  const [promoting, setPromoting] = useState(false)

  const handlePromote = async () => {
    if (!selectedOriginalId || !canApprove) return
    setPromoting(true)
    try {
      await onPromoteToMaster(selectedOriginalId)
      setMode("master")
    } finally {
      setPromoting(false)
    }
  }

  // === Trường hợp chưa có master nào VÀ chưa có ảnh gốc nào ===
  if (masters.length === 0 && assets.length === 0 && !loadingMasters && !loadingAssets) {
    return (
      <Card className="w-full p-4.5 border-2 border-dashed border-warning bg-warning-bg flex flex-col gap-2 shadow-xs">
        <div className="text-body font-extrabold text-warning-text">
          Chưa có ảnh nào trong kho
        </div>
        <div className="text-meta text-warning-text">
          Hãy tải ảnh lên ở Tab Tối ưu trước để có ảnh nguồn.
        </div>
        <div>
          <Button size="sm" variant="outline" onClick={onGoToOptimize}>
            <ArrowLeft size={14} className="mr-1.5" /> Sang Tab Tối ưu
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Radio Group: Master vs Skip */}
      <Card className="w-full p-4 border border-border bg-surface shadow-xs">
        <div className="text-caption font-bold text-text mb-3 uppercase tracking-wider">
          Chọn nguồn ảnh đầu vào
        </div>

        <RadioGroup
          aria-label="Nguồn ảnh đầu vào"
          value={mode}
          onValueChange={(v) => setMode(v as typeof mode)}
          className="flex flex-col gap-2.5"
        >
          {/* Option 1: Master đã duyệt */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
              mode === "master"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface hover:border-text-muted/40"
            } ${masters.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <RadioGroupItem value="master" disabled={masters.length === 0} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-body-sm font-bold text-text flex items-center gap-2">
                <ShieldCheck size={15} className="text-secondary flex-shrink-0" />
                Chọn Master Image đã duyệt (từ Tab 1)
              </div>
              <div className="text-caption text-text-muted mt-0.5">
                Ảnh đã qua cổng Identity Guard — đảm bảo chất lượng chuẩn Studio
              </div>
              {masters.length === 0 && (
                <div className="text-caption text-warning-text font-bold mt-1">
                  Chưa có Master nào. Chạy Tab 1 trước hoặc chọn Skip bên dưới.
                </div>
              )}
            </div>
            {masters.length > 0 && (
              <Badge tone="success" className="flex-shrink-0 text-caption">
                {masters.length} ảnh
              </Badge>
            )}
          </label>

          {/* Option 2: Skip — Dùng ảnh gốc */}
          <label
            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition cursor-pointer ${
              mode === "skip"
                ? "border-primary bg-primary/5"
                : "border-border bg-surface hover:border-text-muted/40"
            } ${assets.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <RadioGroupItem value="skip" disabled={assets.length === 0} className="mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-body-sm font-bold text-text flex items-center gap-2">
                <Sparkles size={15} className="text-primary flex-shrink-0" />
                Skip — Chỉ dùng ảnh gốc (không qua Tab 1)
              </div>
              <div className="text-caption text-text-muted mt-0.5">
                Ảnh gốc đã đẹp sẵn / muốn giữ mộc mạc — duyệt nhanh 1-chạm thành Master
              </div>
            </div>
          </label>
        </RadioGroup>
      </Card>

      {/* === Master Dropdown (khi chọn Option 1) === */}
      {mode === "master" && masters.length > 0 && (
        <Card className="w-full p-4.5 border border-border bg-surface flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3.5 min-w-0">
            {(() => {
              const activeMaster = masters.find((m) => m.id === selectedMasterId) ?? masters[0]!
              return (
                <>
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-border bg-surface-alt flex items-center justify-center relative shadow-xs">
                    {activeMaster.url ? (
                      <img
                        src={activeMaster.url}
                        alt={activeMaster.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={24} className="text-text-muted" />
                    )}
                    <div className="absolute top-1 right-1 rounded-full bg-success-bg p-0.5 text-secondary">
                      <span className="text-caption font-bold">✓</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-bold uppercase tracking-wider text-secondary">
                        Master Image nguồn
                      </span>
                      <Badge tone="success" className="text-caption">Đã duyệt</Badge>
                    </div>
                    <div className="text-title-sm font-extrabold text-text truncate mt-0.5">
                      {activeMaster.name}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>

          {masters.length > 1 && (
            <Select
              value={selectedMasterId || masters[0]!.id}
              onValueChange={onSelectMaster}
            >
              <SelectTrigger aria-label="Chọn Master Image nguồn" className="h-9 min-w-44 text-caption">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {masters.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Card>
      )}

      {/* === Skip: Chọn ảnh gốc + Nút duyệt nhanh (khi chọn Option 2) === */}
      {mode === "skip" && assets.length > 0 && (
        <Card className="w-full p-4 border border-border bg-surface shadow-xs flex flex-col gap-3">
          <div className="text-caption font-bold text-text uppercase tracking-wider">
            Chọn ảnh gốc để duyệt nhanh thành Master
          </div>

          <RadioGroup
            aria-label="Ảnh gốc để duyệt thành Master"
            value={selectedOriginalId}
            onValueChange={(v) => setSelectedOriginalId(v as string)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[280px] overflow-y-auto"
          >
            {assets.map((a) => {
              const isSelected = selectedOriginalId === a.id
              return (
                <label
                  key={a.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg border-2 transition cursor-pointer text-body-sm ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-surface hover:border-text-muted/40"
                  }`}
                >
                  <RadioGroupItem value={a.id} />
                  <div className="h-11 w-11 flex-shrink-0 overflow-hidden rounded-lg bg-surface-alt flex items-center justify-center border border-border">
                    {a.url ? (
                      <img
                        src={a.url}
                        alt={a.name}
                        className="h-full w-full object-cover rounded"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.style.display = "none" }}
                      />
                    ) : (
                      <ImageIcon size={16} className="text-text-muted" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-meta font-bold truncate text-text">{a.name}</div>
                    <div className="text-caption text-text-muted">{a.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                </label>
              )
            })}
          </RadioGroup>

          {/* Nút duyệt nhanh 1-chạm */}
          <Button
            className="w-full h-10 gap-2 font-bold"
            onClick={handlePromote}
            disabled={!selectedOriginalId || promoting || !canApprove}
          >
            {promoting ? (
              <>
                <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
                Đang tạo Master...
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Duyệt nhanh → Tạo Master 1-chạm
              </>
            )}
          </Button>

          {!canApprove && (
            <div className="text-caption text-warning-text font-medium text-center">
              Tài khoản chưa có năng lực I2 (duyệt ảnh). Liên hệ quản trị viên.
            </div>
          )}
        </Card>
      )}

      {/* Loading states */}
      {(loadingMasters || loadingAssets) && (
        <div className="text-center py-3 text-body-sm text-text-muted flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" />
          {loadingMasters ? "Đang tải Master Images..." : "Đang tải ảnh gốc..."}
        </div>
      )}
    </div>
  )
}
