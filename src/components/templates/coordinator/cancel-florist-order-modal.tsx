"use client"

import React, { useState } from "react"
import { Ban } from "@/components/ui/icon-set/ban"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSession } from "@/lib/session"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"

export interface CancelFloristOrderModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderCode: string
  recipeTitle: string
  onConfirmCancel: (reason: string) => Promise<void>
}


export function CancelFloristOrderModal({
  open,
  onOpenChange,
  orderCode,
  recipeTitle,
  onConfirmCancel,
}: CancelFloristOrderModalProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { organization } = useSession()
  const ti = getIndustryTerminology(organization?.industry)

  const QUICK_REASONS = [
    "Thợ quá tải / Bận giờ cao điểm",
    `Hết ${ti.rawMaterialItem} chính trong công thức`,
    "Thời gian chuẩn bị quá gấp",
    "Mức giá gia công chưa đạt thỏa thuận",
    "Khu vực giao quá xa phạm vi xưởng",
  ]

  const handleSelectQuickReason = (tag: string) => {
    if (!reason.trim()) {
      setReason(tag)
    } else if (!reason.includes(tag)) {
      setReason(`${reason.trim()}, ${tag}`)
    }
  }

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Vui lòng ghi ngắn gọn lý do từ chối / hủy nhận đơn.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await onConfirmCancel(reason.trim())
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể thực hiện hủy đơn.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={
        <div className="flex items-center gap-2 text-danger">
          <Ban size={18} />
          <span>Hủy Không Nhận Đơn Gia Công</span>
        </div>
      }
      description={`Đơn #${orderCode} • ${recipeTitle}`}
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            Quay lại
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={submitting}
            className="bg-danger hover:bg-danger-text text-white font-bold"
          >
            {submitting ? "Đang xử lý..." : "Xác nhận hủy đơn"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1 text-caption">
        {error && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger font-medium">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="font-bold text-text block">Chọn nhanh lý do từ chối</label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_REASONS.map((tag) => (
              <Button variant="outline"
                type="button"
                key={tag}
                onClick={() => handleSelectQuickReason(tag)}
                className="h-auto gap-0 cursor-pointer px-2.5 py-1 rounded-lg border border-border bg-surface-alt hover:bg-surface text-text font-medium text-caption transition-colors"
              >
                + {tag}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-text block">
            Lý do chi tiết <span className="text-danger">*</span>
          </label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nhập lý do cụ thể vì sao không nhận đơn (được lưu vào lịch sử kiểm toán)..."
            className="w-full text-body-sm"
          />
        </div>

        <div className="p-3 rounded-xl bg-danger/5 border border-danger/20 text-caption flex items-start gap-2 text-text-muted">
          <AlertCircle size={15} className="shrink-0 mt-0.5 text-danger" />
          <span>
            Hành động này sẽ hủy và đóng đơn gia công trong hệ thống điều phối, đồng thời lưu trữ lý do hủy vào lịch sử kiểm toán của đơn hàng.
          </span>
        </div>
      </div>
    </Dialog>
  )
}
