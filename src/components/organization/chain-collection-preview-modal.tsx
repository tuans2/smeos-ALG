"use client"

import React from "react"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { ShieldAlert } from "@/components/ui/icon-set/shield-alert"
import { Store } from "@/components/ui/icon-set/store"
import { Layers } from "@/components/ui/icon-set/layers"
import type { PreviewChainCollectionProfileResult } from "@/modules/field-platform/use-cases/preview-chain-collection-profile"

interface PreviewModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onConfirmPublish: () => void
  readonly previewData: PreviewChainCollectionProfileResult | null
  readonly isPublishing: boolean
}

export function ChainCollectionPreviewModal({
  isOpen,
  onClose,
  onConfirmPublish,
  previewData,
  isPublishing,
}: PreviewModalProps) {
  if (!isOpen || !previewData) return null

  const { validation, affectedStoreCount, riskLevel, summary } = previewData
  const isR1 = riskLevel === "R1_HIGH_RISK"

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Xem trước tác động cấu hình thu thập"
    >
      <div className="space-y-4">
        {/* Risk Banner */}
        <div
          className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            isR1
              ? "bg-warning/10 border-warning/30 text-warning-text"
              : "bg-primary/10 border-primary/30 text-primary"
          }`}
        >
          {isR1 ? <ShieldAlert size={20} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={20} className="shrink-0 mt-0.5" />}
          <div>
            <h4 className="font-extrabold text-body-sm">
              {isR1 ? "Cấp độ Rủi ro Cao (R1)" : "Cấp độ Tiêu chuẩn (R2)"}
            </h4>
            <p className="text-caption text-text-muted mt-0.5">
              {isR1
                ? "Cấu hình có thu thập thông tin nhạy cảm, thông tin cá nhân khách hàng hoặc áp dụng cho cửa hàng đối tác. Cần có mục đích pháp lý rõ ràng."
                : "Cấu hình an toàn trong giới hạn dữ liệu công khai và nội bộ tiêu chuẩn."}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-border bg-surface-alt text-center">
            <Store size={16} className="mx-auto text-primary mb-1" />
            <div className="text-title-sm font-black text-text">{affectedStoreCount}</div>
            <div className="text-caption text-text-muted">Cửa hàng áp dụng</div>
          </div>
          <div className="p-3 rounded-xl border border-border bg-surface-alt text-center">
            <Layers size={16} className="mx-auto text-primary mb-1" />
            <div className="text-title-sm font-black text-text">{summary.activeRuleCount}</div>
            <div className="text-caption text-text-muted">Trường thu thập</div>
          </div>
          <div className="p-3 rounded-xl border border-border bg-surface-alt text-center">
            <ShieldAlert size={16} className="mx-auto text-warning mb-1" />
            <div className="text-title-sm font-black text-warning-text">{summary.s2FieldsCollected}</div>
            <div className="text-caption text-text-muted">Trường S2/Cá nhân</div>
          </div>
        </div>

        {/* Issues List */}
        {!validation.isValid && (
          <div className="p-3 rounded-xl border border-danger/30 bg-danger/10 space-y-2">
            <div className="flex items-center gap-2 text-danger font-bold text-caption">
              <AlertTriangle size={15} />
              <span>Phát hiện {validation.issues.length} lỗi xung đột cần xử lý:</span>
            </div>
            <ul className="text-caption text-danger/90 list-disc list-inside space-y-1">
              {validation.issues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPublishing}>
            Đóng chỉnh sửa
          </Button>
          <Button
            size="sm"
            onClick={onConfirmPublish}
            disabled={!validation.isValid || isPublishing}
            className="font-bold bg-primary text-white"
          >
            {isPublishing ? "Đang xuất bản…" : "Xác nhận & Xuất bản Profile"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
