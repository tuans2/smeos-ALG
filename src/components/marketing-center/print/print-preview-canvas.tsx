"use client"

import React, { useState } from "react"
import type { PrintPreset } from "@/modules/print/domain/print-preset"
import { Eye } from "@/components/ui/icon-set/eye"
import { Scissors } from "@/components/ui/icon-set/scissors"
import { QrCode } from "@/components/ui/icon-set/qr-code"
import { Button } from "@/components/ui/button"

export interface PrintPreviewCanvasProps {
  preset: PrintPreset
  title: string
  subtitle?: string | undefined
  storeName: string
  qrLink?: string | undefined
  materialName?: string | undefined
}

export function PrintPreviewCanvas({
  preset,
  title,
  subtitle,
  storeName,
  qrLink,
  materialName = "Giấy Couche 300gsm",
}: PrintPreviewCanvasProps) {
  const [showGuidelines, setShowGuidelines] = useState(true)

  // Tỷ lệ khung hình hiển thị (tối đa 480px cao)
  const isPortrait = preset.heightMm >= preset.widthMm
  const aspectRatio = preset.widthMm / preset.heightMm

  return (
    <div className="space-y-4">
      {/* Thanh điều khiển hiển thị */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-caption">
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />
            <span>Mép tràn lề (+{preset.bleedMm}mm)</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-text inline-block" />
            <span>Đường xén</span>
          </span>
          <span className="flex items-center gap-1.5 text-text-muted">
            <span className="w-2.5 h-2.5 rounded-full bg-success inline-block" />
            <span>Vùng an toàn (-{preset.safeMarginMm}mm)</span>
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGuidelines(!showGuidelines)}
          className="h-8 gap-1.5 text-caption"
          title="Bật/Tắt đường hướng dẫn kỹ thuật"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showGuidelines ? "Ẩn lưới canh" : "Hiện lưới canh"}</span>
        </Button>
      </div>

      {/* Vùng canvas mô phỏng bản in */}
      <div className="w-full flex items-center justify-center p-6 sm:p-10 rounded-2xl bg-surface-alt border border-border/80 overflow-hidden min-h-[380px]">
        <div
          style={{
            aspectRatio: `${aspectRatio}`,
            maxHeight: isPortrait ? "420px" : "320px",
            width: isPortrait ? undefined : "100%",
            maxWidth: isPortrait ? "340px" : "480px",
          }}
          className={`relative bg-surface rounded-sm shadow-xl transition-all flex flex-col justify-between p-4 sm:p-6 overflow-hidden ${
            showGuidelines ? "border-2 border-dashed border-danger/70" : "border border-border"
          }`}
        >
          {/* Dấu xén 4 góc (Crop marks) */}
          {showGuidelines && (
            <>
              <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-text pointer-events-none" />
              <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-text pointer-events-none" />
              <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-text pointer-events-none" />
              <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-text pointer-events-none" />
            </>
          )}

          {/* Vùng an toàn chữ & logo */}
          <div
            className={`w-full h-full flex flex-col justify-between transition-all ${
              showGuidelines ? "border border-dotted border-success/70 p-3 rounded-xs" : ""
            }`}
          >
            {/* Header bản in */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-caption uppercase tracking-wider font-extrabold text-primary">
                  {storeName}
                </span>
                <Scissors className="w-3.5 h-3.5 text-text-muted/60" />
              </div>
              <h3 className="text-body-sm sm:text-title-sm font-bold text-text leading-snug line-clamp-2">
                {title || "Tiêu đề ấn phẩm"}
              </h3>
              {subtitle && (
                <p className="text-caption text-text-muted line-clamp-2 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Phần thân minh họa */}
            <div className="my-auto py-3 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-surface-alt border border-border/80 flex flex-col items-center justify-center p-2 shadow-2xs">
                <QrCode className="w-8 h-8 sm:w-10 sm:h-10 text-text mb-1" />
                <span className="text-caption font-bold text-text-muted tracking-tight">
                  QUÉT MÃ
                </span>
              </div>
              <p className="text-caption text-text-muted mt-2 max-w-[180px] truncate">
                {qrLink || "https://avilotusgroup.com/shop"}
              </p>
            </div>

            {/* Footer bản in */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-caption text-text-muted">
              <span>Chuẩn in: 300 DPI</span>
              <span>{materialName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Thông tin kích thước chi tiết */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-surface border border-border text-caption text-text-muted">
        <div>
          <span>Kích thước thành phẩm: </span>
          <strong className="text-text font-semibold">
            {preset.widthMm} × {preset.heightMm} mm
          </strong>
        </div>
        <div>
          <span>Khổ file kèm tràn lề: </span>
          <strong className="text-text font-semibold">
            {preset.widthMm + preset.bleedMm * 2} × {preset.heightMm + preset.bleedMm * 2} mm
          </strong>
        </div>
      </div>
    </div>
  )
}
