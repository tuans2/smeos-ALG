"use client"

import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { CheckCircle2, Loader2 } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"

interface Props {
  requestId: string
  refundDueVnd: number
  reason: string
  onDone: (message: string) => void
}

const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

/** Đơn hệ thống tự huỷ: Điều hành chuyển hoàn tiền / liên hệ khách xong thì xác nhận tại đây. */
export function CancellationFollowUp({ requestId, refundDueVnd, reason, onDone }: Props) {
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await apiSend(
        `/api/v1/greeting-card/cancellation-requests/${requestId}/follow-up`,
        "POST",
        { note: note.trim() || undefined },
        "Không thể ghi nhận đã xử lý"
      )
      onDone(refundDueVnd > 0 ? `Đã ghi nhận hoàn ${vnd(refundDueVnd)} vào sổ thu` : "Đã đánh dấu xử lý xong")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi khi xử lý")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 text-body-sm">
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2.5 text-text">
        <p><strong>Lý do Điều phối từ chối:</strong> {reason}</p>
        {refundDueVnd > 0 ? (
          <p>
            <strong>Cần chuyển hoàn cho khách:</strong>{" "}
            <span className="font-mono font-bold text-danger">{vnd(refundDueVnd)}</span>
          </p>
        ) : (
          <p>Khách chưa trả tiền — chỉ cần báo khách đơn đã huỷ.</p>
        )}
      </div>
      {error && <p role="alert" className="text-caption font-semibold text-danger">{error}</p>}
      <Input
        type="text"
        placeholder="Ghi chú (mã giao dịch hoàn tiền, đã gọi khách...)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
        className="h-8 w-full rounded-lg border border-border bg-bg px-2.5 text-caption text-text focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={busy} onClick={() => void confirm()} className="h-8 gap-1 text-caption font-bold">
          {busy ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <CheckCircle2 size={14} />}
          <span>{refundDueVnd > 0 ? "Đã hoàn tiền cho khách" : "Đã xử lý xong"}</span>
        </Button>
      </div>
    </div>
  )
}
