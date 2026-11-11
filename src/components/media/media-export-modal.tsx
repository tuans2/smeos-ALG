"use client"

import React, { useState } from "react"
import { Download } from "@/components/ui/icon-set/download"
import { Share2 } from "@/components/ui/icon-set/share2"
import { Check } from "@/components/ui/icon-set/check"
import { Film } from "@/components/ui/icon-set/film"
import { Image as ImageIcon } from "@/components/ui/icon-set/image"
import { Copy } from "@/components/ui/icon-set/copy"
import { ExternalLink } from "@/components/ui/icon-set/external-link"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  EXPORT_PRESETS,
  getExportPresetsForMediaType,
  buildExportFileName,
  validateMediaExport,
  type ExportPreset,
} from "@/modules/media/domain/media-export-presets"

export interface MediaExportModalProps {
  isOpen: boolean
  onClose: () => void
  mediaType: "IMAGE" | "VIDEO"
  mediaUrl: string
  productTitle: string
  durationSeconds?: number | undefined
}

export function MediaExportModal({
  isOpen,
  onClose,
  mediaType,
  mediaUrl,
  productTitle,
  durationSeconds,
}: MediaExportModalProps) {
  const presets = getExportPresetsForMediaType(mediaType)
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    presets[0]?.id ?? "TIKTOK_VERTICAL"
  )
  const [format, setFormat] = useState<"png" | "jpeg" | "mp4">(
    mediaType === "VIDEO" ? "mp4" : "jpeg"
  )
  const [downloading, setDownloading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  const activePreset: ExportPreset =
    presets.find((p) => p.id === selectedPresetId) ?? presets[0]!

  const validation = validateMediaExport({
    targetPresetId: activePreset.id,
    mediaType,
    durationSeconds,
  })

  const exportFileName = buildExportFileName({
    productTitle,
    platform: activePreset.platform,
    ratio: activePreset.ratio,
    format,
  })

  async function handleDownload() {
    setDownloading(true)
    try {
      const response = await fetch(mediaUrl)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = exportFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch {
      window.open(mediaUrl, "_blank")
    } finally {
      setDownloading(false)
    }
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(mediaUrl).then(() => {
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    })
  }

  const dialogTitle = (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {mediaType === "VIDEO" ? <Film size={18} /> : <ImageIcon size={18} />}
      </div>
      <div>
        <div className="text-title-sm font-extrabold text-text">
          Xuất File Chuẩn Tỉ Lệ Đa Kênh Mạng Xã Hội
        </div>
        <div className="text-caption text-text-muted">
          Tối ưu hóa kích thước &amp; độ phân giải theo quy chuẩn từng nền tảng
        </div>
      </div>
    </div>
  )

  const dialogFooter = (
    <div className="flex items-center justify-between w-full">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopyLink}
        className="h-8 text-caption gap-1.5"
      >
        {copiedLink ? <Check size={12} className="text-success" /> : <Copy size={12} />}
        {copiedLink ? "Đã copy link!" : "Copy link gốc"}
      </Button>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="h-8 text-caption"
        >
          Đóng
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleDownload()}
          disabled={downloading}
          className="h-8 text-caption font-bold bg-primary hover:bg-primary-dark text-white gap-1.5 shadow-sm"
        >
          <Download size={13} />
          {downloading ? "Đang chuẩn bị..." : "Tải xuống ngay"}
        </Button>
      </div>
    </div>
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={dialogTitle}
      footer={dialogFooter}
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Chọn nền tảng mục tiêu */}
        <div>
          <label className="text-caption font-bold text-text block mb-2">
            1. Chọn chuẩn tỉ lệ &amp; nền tảng đăng:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {presets.map((preset) => {
              const isSelected = preset.id === activePreset.id
              return (
                <Button
                  key={preset.id}
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedPresetId(preset.id)
                    if (mediaType === "IMAGE") {
                      setFormat(preset.recommendedFormat === "PNG" ? "png" : "jpeg")
                    }
                  }}
                  className={`p-2.5 h-auto rounded-xl border text-left transition-all block whitespace-normal w-full ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-surface hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-caption text-text">
                      {preset.platformLabel}
                    </span>
                    <Badge tone={isSelected ? "success" : "neutral"}>
                      {preset.ratio}
                    </Badge>
                  </div>
                  <div className="text-caption text-text-muted mt-1 font-mono font-normal">
                    {preset.dimensions.width}×{preset.dimensions.height}
                  </div>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Thông tin chi tiết preset được chọn */}
        <div className="p-3.5 rounded-xl border border-border/80 bg-surface-raised space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-body-sm font-bold text-text">
              {activePreset.label}
            </span>
            <span className="text-caption font-semibold text-primary">
              {activePreset.dimensions.width} × {activePreset.dimensions.height} px
            </span>
          </div>
          <p className="text-caption text-text-muted">
            {activePreset.description}
          </p>

          {validation.warning && (
            <div className="text-caption font-semibold text-warning-text bg-warning-bg p-2 rounded-lg border border-warning/30">
              ⚠️ {validation.warning}
            </div>
          )}
        </div>

        {/* Định dạng file & tên file */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-caption font-bold text-text">
              2. Định dạng file:
            </label>
            <div className="flex items-center gap-1.5">
              {mediaType === "IMAGE" ? (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormat("jpeg")}
                    className={`px-2.5 py-1 h-auto rounded-lg text-caption font-bold border ${
                      format === "jpeg"
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-text-muted border-border"
                    }`}
                  >
                    JPEG (Tối ưu web)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormat("png")}
                    className={`px-2.5 py-1 h-auto rounded-lg text-caption font-bold border ${
                      format === "png"
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-text-muted border-border"
                    }`}
                  >
                    PNG (Chất lượng cao)
                  </Button>
                </>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-caption font-bold bg-primary text-white">
                  MP4 (H.264 Video)
                </span>
              )}
            </div>
          </div>

          <div className="text-caption text-text-muted flex items-center gap-1.5 bg-surface-alt p-2 rounded-lg border border-border/60 font-mono overflow-x-auto">
            <span className="shrink-0 text-text font-sans font-semibold">Tên file:</span>
            <span className="text-primary truncate">{exportFileName}</span>
          </div>
        </div>
      </div>
    </Dialog>
  )
}
