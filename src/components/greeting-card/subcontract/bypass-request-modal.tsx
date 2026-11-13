"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { AlertTriangle, ShieldAlert, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"

export interface BypassRequestModalProps {
  isOpen: boolean
  stepTitle: string
  stepKey: "QC" | "SHIPPER" | "POD"
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}

export function BypassRequestModal({
  isOpen,
  stepTitle,
  stepKey,
  onClose,
  onSubmit,
}: BypassRequestModalProps) {
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg("Vui lòng ghi rõ lý do bất khả kháng (tối thiểu 5 ký tự).")
      return
    }

    setSubmitting(true)
    try {
      await onSubmit(reason.trim())
      setReason("")
      onClose()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi khi gửi yêu cầu")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !submitting) onClose() }} size="sm"
      title={<span className="flex items-center gap-2"><ShieldAlert size={18} className="text-warning-text" />Xin Bỏ Qua: {stepTitle}</span>}>
      <div className="flex flex-col">
        {/* Warning Content */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="p-3.5 rounded-xl bg-danger-bg border border-danger/30 flex flex-col gap-2 text-caption">
            <div className="flex items-center gap-2 text-danger font-extrabold">
              <AlertTriangle size={16} className="shrink-0" />
              <span>CẢNH BÁO TRỪ ĐIỂM HỢP TÁC & PHÂN BỔ ĐƠN</span>
            </div>
            <p className="text-text leading-relaxed">
              Việc không cung cấp đầy đủ bằng chứng ({stepKey}) ảnh hưởng đến độ tin cậy dịch vụ của toàn chuỗi:
            </p>
            <ul className="list-disc pl-4 text-danger font-semibold space-y-1">
              <li>Chi nhánh sẽ <strong>bị trừ 2 điểm chất lượng KPI</strong> nếu được duyệt bỏ qua.</li>
              <li>Điểm KPI giảm sẽ <strong>hạ thứ tự ưu tiên nhận đơn gia công</strong> trong các đợt phân bổ tự động tiếp theo.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="bypass-reason" className="block text-caption font-bold text-text mb-1.5">
              Lý do bất khả kháng (Bắt buộc) <span className="text-danger">*</span>
            </label>
            <Textarea
              id="bypass-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Khách nhận gấp tại quầy / Thiết bị camera bị hỏng đột xuất..."
              className="w-full p-3 rounded-xl border border-border bg-surface text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {errorMsg && (
            <p className="text-caption font-bold text-danger bg-danger-bg p-2.5 rounded-lg border border-danger/20">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 h-10 text-caption font-bold"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="secondary"
              disabled={submitting}
              className="flex-1 h-10 text-caption font-extrabold bg-warning hover:bg-warning/90 text-text"
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="animate-spin motion-reduce:animate-none mr-1.5" /> Đang gửi...
                </>
              ) : (
                "Xác nhận gửi Điều phối"
              )}
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
