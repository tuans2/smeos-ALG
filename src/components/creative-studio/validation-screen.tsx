"use client"

import React from "react"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { XCircle } from "@/components/ui/icon-set/x-circle"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Button } from "@/components/ui/button"

import type { TransitionValidationResult, TransitionField } from "@/modules/creative-production/domain/validate-transition"

// ============================================================
// PROPS
// ============================================================

export interface ValidationScreenProps {
  /** Kết quả validate */
  readonly result: TransitionValidationResult
  /** Callback khi user nhấn "Tiếp tục" (chỉ khi valid) */
  readonly onContinue: () => void
  /** Callback khi user nhấn "Quay lại" */
  readonly onGoBack: () => void
}

// ============================================================
// COMPONENT
// ============================================================

export function ValidationScreen({
  result,
  onContinue,
  onGoBack,
}: ValidationScreenProps) {
  const { valid, fields, errors, warnings, completionPercent } = result

  const requiredFields = fields.filter((f) => f.required)
  const optionalFields = fields.filter((f) => !f.required)

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground mx-auto">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h2 className="text-title font-extrabold text-text">
          Kiểm tra dữ liệu Chặng 1-4
        </h2>
        <p className="text-body-sm text-text-muted max-w-md mx-auto">
          Đảm bảo tất cả dữ liệu carry-forward đã sẵn sàng trước khi bắt đầu sáng tạo nội dung.
        </p>
      </div>

      {/* ── Progress Bar ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-meta font-bold text-text-muted uppercase tracking-wider">
            Mức độ hoàn thiện
          </span>
          <span className={`text-body font-extrabold ${
            completionPercent >= 80 ? "text-success" : "text-warning-text"
          }`}>
            {completionPercent}%
          </span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-surface-alt overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              completionPercent >= 80
                ? "bg-success"
                : "bg-warning"
            }`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {/* ── Errors ── */}
      {errors.length > 0 && (
        <div className="rounded-xl border-2 border-dashed border-danger/30 bg-danger/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-meta font-bold text-danger uppercase tracking-wider">
            <XCircle className="h-4 w-4" />
            Thiếu dữ liệu bắt buộc ({errors.length})
          </div>
          <ul className="space-y-1">
            {errors.map((err, i) => (
              <li key={i} className="text-meta text-danger flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>{err}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Required Fields ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h4 className="text-body-sm font-bold text-text mb-3">
          ✅ Dữ liệu bắt buộc
        </h4>
        <div className="space-y-1.5">
          {requiredFields.map((f) => (
            <FieldRow key={f.field} field={f} />
          ))}
        </div>
      </div>

      {/* ── Optional Fields ── */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <h4 className="text-body-sm font-bold text-text mb-3">
          💡 Dữ liệu tùy chọn (nâng cao chất lượng)
        </h4>
        <div className="space-y-1.5">
          {optionalFields.map((f) => (
            <FieldRow key={f.field} field={f} />
          ))}
        </div>
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-meta font-bold text-warning-text uppercase tracking-wider">
            <AlertTriangle className="h-4 w-4" />
            Gợi ý cải thiện ({warnings.length})
          </div>
          <ul className="space-y-1">
            {warnings.slice(0, 5).map((w, i) => (
              <li key={i} className="text-caption text-warning-text flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={onGoBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </Button>
        <Button
          onClick={onContinue}
          className="gap-2 bg-primary hover:bg-primary-dark text-white"
        >
          {valid ? "Tiếp tục Creative Studio" : "Bỏ qua & Tiếp tục sáng tạo"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ============================================================
// SUB-COMPONENT
// ============================================================

function FieldRow({ field }: { field: TransitionField }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-alt transition-colors">
      {/* Status icon */}
      {field.present ? (
        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
      ) : field.required ? (
        <XCircle className="h-4 w-4 text-danger flex-shrink-0" />
      ) : (
        <div className="h-4 w-4 rounded-full border-2 border-border flex-shrink-0" />
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="text-meta font-medium text-text">{field.label}</div>
        <div className="text-caption text-text-muted">{field.source}</div>
      </div>

      {/* Value summary */}
      <span className={`text-caption truncate max-w-[180px] ${
        field.present ? "text-text-muted" : "text-text-muted/60 italic"
      }`}>
        {field.summary}
      </span>
    </div>
  )
}
