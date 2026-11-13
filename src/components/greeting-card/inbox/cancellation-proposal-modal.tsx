"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { AlertTriangle, Loader2, DollarSign } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import {
  IN_TRANSIT_CANCEL_WARNING,
  isInTransit,
  CANCELLATION_TYPE_LABEL,
  type CancellationType,
  validateCancellationProposal,
} from "@/modules/greeting-card/domain/cancellation-request"

interface Props {
  orderId: string
  orderCode: string
  totalVnd: number
  paidVnd: number
  /** Đơn đang giao → hiện cảnh báo shipper đang trên đường */
  deliveryStatus?: string | null | undefined
  onClose: () => void
  onSuccess: () => void
}

export function CancellationProposalModal({
  orderId,
  orderCode,
  totalVnd,
  paidVnd,
  deliveryStatus,
  onClose,
  onSuccess,
}: Props) {
  const [type, setType] = useState<CancellationType>(paidVnd > 0 ? "FULL_REFUND" : "CANCEL_ONLY")
  const [refundAmount, setRefundAmount] = useState<string>(paidVnd > 0 ? String(paidVnd) : "0")
  const [reason, setReason] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTypeChange = (newType: CancellationType) => {
    setType(newType)
    if (newType === "CANCEL_ONLY") setRefundAmount("0")
    else if (newType === "FULL_REFUND") setRefundAmount(String(paidVnd))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const refundNum = Math.round(Number(refundAmount) || 0)
    const validationError = validateCancellationProposal(
      {
        type,
        reason: reason.trim(),
        refundAmountVnd: refundNum,
        note: note.trim(),
      },
      { status: "CONFIRMED", totalVnd, paidVnd }
    )

    if (validationError) {
      setError(validationError)
      return
    }

    setBusy(true)
    try {
      await apiSend(
        "/api/v1/greeting-card/cancellation-requests",
        "POST",
        {
          order_id: orderId,
          type,
          reason: reason.trim(),
          refund_amount_vnd: refundNum,
          note: note.trim() || undefined,
        },
        "Không thể gửi đề xuất"
      )
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra khi gửi đề xuất")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm"
      title={<span className="flex items-center gap-2"><AlertTriangle size={20} className="text-danger" />Đề xuất Hủy / Hoàn tiền đơn #{orderCode}</span>}>
      <div className="flex flex-col">
        <p className="text-caption text-text-muted mb-4">
          Tổng đơn: <strong className="text-text">{totalVnd.toLocaleString("vi-VN")}đ</strong> · Đã thu:{" "}
          <strong className="text-success">{paidVnd.toLocaleString("vi-VN")}đ</strong>
        </p>

        {isInTransit(deliveryStatus) && (
          <p role="alert" className="rounded-xl bg-warning-bg p-3 text-body-sm font-semibold text-warning-text">⚠ {IN_TRANSIT_CANCEL_WARNING}. Đề xuất cần Điều hành hoặc Điều phối khác duyệt.</p>
        )}
        {error && (
          <div role="alert" className="p-3 mb-4 rounded-xl bg-danger-bg text-danger text-body-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <div>
            <span id="cancellation-type-label" className="block text-body-sm font-bold text-text mb-1.5">Hình thức đề xuất</span>
            <RadioGroup aria-labelledby="cancellation-type-label" value={type} onValueChange={(v) => handleTypeChange(v as CancellationType)} className="flex flex-col gap-2">
              {(["CANCEL_ONLY", "FULL_REFUND", "PARTIAL_REFUND"] as CancellationType[]).map((t) => (
                <label
                  key={t}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-body-sm transition-colors ${
                    type === t ? "border-primary bg-primary/5 font-semibold text-text" : "border-border text-text-muted"
                  }`}
                >
                  <RadioGroupItem value={t} />
                  <span>{CANCELLATION_TYPE_LABEL[t]}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {type !== "CANCEL_ONLY" && (
            <div>
              <label htmlFor="refund-amount" className="block text-body-sm font-bold text-text mb-1">
                Số tiền đề xuất hoàn (VNĐ) <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Input
                  id="refund-amount"
                  type="number"
                  min="1000"
                  max={paidVnd}
                  step="1000"
                  disabled={type === "FULL_REFUND"}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-body font-mono text-text focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-75"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-caption text-text-muted">đ</span>
              </div>
              {type === "FULL_REFUND" && (
                <p className="mt-1 text-caption text-text-muted">Hoàn trả toàn bộ 100% số tiền khách đã thanh toán</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="cancel-reason" className="block text-body-sm font-bold text-text mb-1">
              Lý do đề xuất <span className="text-danger">*</span>
            </label>
            <Textarea
              id="cancel-reason"
              required
              rows={2}
              placeholder="VD: Khách đổi lịch đột xuất không nhận hoa..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg p-2.5 text-body text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="cancel-note" className="block text-body-sm font-bold text-text mb-1">
              Ghi chú thêm cho Điều hành (tùy chọn)
            </label>
            <Input
              id="cancel-note"
              type="text"
              placeholder="VD: Đã xin ý kiến khách qua Zalo..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-bg px-3 text-body-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border mt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={busy}>
              Đóng
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy}
              className="bg-danger hover:bg-danger-text text-white font-bold gap-1.5"
            >
              {busy && <Loader2 size={14} className="animate-spin motion-reduce:animate-none" />}
              <span>Gửi Điều hành duyệt</span>
            </Button>
          </div>
        </form>
      </div>
    </Dialog>
  )
}
