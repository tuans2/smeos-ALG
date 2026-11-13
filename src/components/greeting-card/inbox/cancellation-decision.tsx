"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { AlertOctagon, CheckCircle2, Loader2, XCircle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { CANCELLATION_TYPE_LABEL, type CancellationType } from "@/modules/greeting-card/domain/cancellation-request"

interface Props {
  requestId: string
  type: string
  refundAmountVnd: number
  reason: string
  onDone: (message: string) => void
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

export function CancellationDecision({
  requestId,
  type,
  refundAmountVnd,
  reason,
  onDone,
}: Props) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const typeLabel = CANCELLATION_TYPE_LABEL[type as CancellationType] || type

  async function handleDecide(approve: boolean) {
    setBusy(true)
    setError(null)
    try {
      await apiSend(
        `/api/v1/greeting-card/cancellation-requests/${requestId}/decision`,
        "POST",
        {
          approve,
          note: note.trim() || undefined,
        },
        "Không thể xử lý quyết định"
      )
      onDone(
        approve
          ? `Đã phê duyệt ${typeLabel.toLowerCase()}`
          : "Đã từ chối đề xuất hủy/hoàn tiền"
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi xử lý")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger-bg/20 p-3.5 text-body-sm">
      <div className="flex items-center gap-2 text-danger font-extrabold">
        <AlertOctagon size={16} />
        <span>Yêu cầu phê duyệt: {typeLabel}</span>
      </div>

      <div className="text-text flex flex-col gap-1 bg-surface p-2.5 rounded-lg border border-border">
        <p><strong>Lý do đề xuất:</strong> {reason}</p>
        {refundAmountVnd > 0 && (
          <p><strong>Số tiền hoàn:</strong> <span className="text-danger font-mono font-bold">{vnd(refundAmountVnd)}</span></p>
        )}
      </div>

      {error && <p role="alert" className="text-caption font-semibold text-danger">{error}</p>}

      <Input
        type="text"
        placeholder="Ghi chú phản hồi cho người đề xuất..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
        className="h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-caption text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void handleDecide(false)}
          className="h-8 gap-1 text-caption text-danger hover:bg-danger-bg"
        >
          <XCircle size={14} />
          <span>Từ chối</span>
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={() => void handleDecide(true)}
          className="h-8 gap-1 bg-danger hover:bg-danger-text text-white text-caption font-bold"
        >
          {busy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
          <span>Phê duyệt</span>
        </Button>
      </div>
    </div>
  )
}
