"use client"

import React from "react"
import type { PreflightReport } from "@/modules/print/domain/print-preset"
import { Badge } from "@/components/ui/badge"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { FileCheck2 } from "@/components/ui/icon-set/file-check2"
import { Scissors } from "@/components/ui/icon-set/scissors"
import { QrCode } from "@/components/ui/icon-set/qr-code"

export interface PreflightChecklistProps {
  report: PreflightReport | null
  isLoading?: boolean
}

export function PreflightChecklist({
  report,
  isLoading = false,
}: PreflightChecklistProps) {
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-border bg-surface-alt/50 animate-pulse motion-reduce:animate-none text-caption text-text-muted">
        Đang kiểm tra quy cách in ấn và an toàn xén tràn lề...
      </div>
    )
  }

  if (!report) {
    return null
  }

  const { passed, errors, warnings, details } = report

  return (
    <div className="space-y-4">
      {/* Thẻ trạng thái tổng quát */}
      <div
        className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
          passed
            ? "border-success/30 bg-success/5 text-text"
            : "border-danger/30 bg-danger/5 text-text"
        }`}
      >
        {passed ? (
          <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h4 className="text-body-sm font-bold">
            {passed
              ? "Quy cách in đạt chuẩn: Sẵn sàng xuất bản in"
              : "Cần điều chỉnh quy cách trước khi gửi nhà in"}
          </h4>
          <p className="text-caption text-text-muted leading-relaxed">
            {passed
              ? "Mọi thông số về tràn lề, mép xén an toàn, độ phân giải DPI và mã QR đều chuẩn xác kỹ thuật."
              : "Phát hiện một số lỗi có thể làm bản in bị nhòe, mất chi tiết hoặc phạm dao cắt thành phẩm."}
          </p>
        </div>
      </div>

      {/* Danh sách lỗi chặn xuất bản in */}
      {errors.length > 0 && (
        <div className="p-3.5 rounded-xl border border-danger/20 bg-danger/5 space-y-2">
          <div className="flex items-center gap-2 text-danger text-caption font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Lỗi kỹ thuật bắt buộc sửa ({errors.length}):</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-caption text-danger">
            {errors.map((err, idx) => (
              <li key={idx} className="leading-relaxed">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Danh sách cảnh báo */}
      {warnings.length > 0 && (
        <div className="p-3.5 rounded-xl border border-warning/20 bg-warning/5 space-y-2">
          <div className="flex items-center gap-2 text-warning-text text-caption font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Lưu ý kỹ thuật ({warnings.length}):</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc text-caption text-warning-text">
            {warnings.map((warn, idx) => (
              <li key={idx} className="leading-relaxed">
                {warn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 Trụ cột thông số quy cách */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        {/* Bleed */}
        <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <Scissors className="w-3.5 h-3.5 text-primary" />
              <span>Tràn lề (Bleed)</span>
            </span>
            <Badge tone="success">+{details.bleedMm}mm</Badge>
          </div>
          <p className="text-caption text-text font-bold">
            Khổ xén: {details.cutWidthMm} × {details.cutHeightMm} mm
          </p>
        </div>

        {/* Safe Margin */}
        <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <FileCheck2 className="w-3.5 h-3.5 text-primary" />
              <span>Vùng an toàn</span>
            </span>
            <Badge tone="success">-{details.safeMarginMm}mm</Badge>
          </div>
          <p className="text-caption text-text font-bold">
            Cách mép thành phẩm
          </p>
        </div>

        {/* DPI */}
        <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="font-medium">Độ sắc nét</span>
            <Badge tone={details.effectiveDpi && details.effectiveDpi >= details.minRecommendedDpi ? "success" : "warning"}>
              {details.effectiveDpi ? `${details.effectiveDpi} DPI` : "Vector"}
            </Badge>
          </div>
          <p className="text-caption text-text font-bold">
            Chuẩn tối thiểu: {details.minRecommendedDpi} DPI
          </p>
        </div>

        {/* QR Code */}
        <div className="p-3 rounded-xl border border-border bg-surface space-y-1">
          <div className="flex items-center justify-between text-caption text-text-muted">
            <span className="flex items-center gap-1.5 font-medium">
              <QrCode className="w-3.5 h-3.5 text-primary" />
              <span>Mã QR</span>
            </span>
            <Badge tone="accent">≥ 20mm</Badge>
          </div>
          <p className="text-caption text-text font-bold">
            Quét nhanh mọi cự ly
          </p>
        </div>
      </div>
    </div>
  )
}
