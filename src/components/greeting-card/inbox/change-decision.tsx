"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icons"
import { apiSend } from "@/components/greeting-card/greeting-api"
import type { ChangeItem } from "@/modules/greeting-card/domain/order-change-request"

interface Props {
  requestId: string
  changes: ChangeItem[]
  note: string | null
  expectedFeeDeltaVnd: number
  onDone: (message: string) => void
}

/** Duyệt/từ chối yêu cầu đổi thông tin đơn của khách: xem trước → sau từng ô; từ chối phải ghi lý do cho khách. */
export function ChangeDecision({ requestId, changes, note, expectedFeeDeltaVnd, onDone }: Props) {
  const [reply, setReply] = useState("")
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "reject")
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/change-requests/${requestId}/decision`, "POST", { approve, note: reply.trim() }, "Không lưu được quyết định")
      onDone(approve ? "Đã cập nhật đơn — khách thấy thông báo trên trang theo dõi." : "Đã báo khách là chưa đổi được.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được quyết định")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 text-body-sm">
        {changes.map((c) => (
          <li key={c.field}>
            <span className="font-bold text-text">{c.label}:</span>{" "}
            <span className="text-text-muted line-through">{c.before}</span> → <span className="font-bold text-text">{c.after}</span>
          </li>
        ))}
      </ul>
      {note && <p className="text-body-sm text-text-muted">Khách nhắn: &ldquo;{note}&rdquo;</p>}
      {expectedFeeDeltaVnd > 0 && (
        <p className="text-body-sm text-warning-text">Duyệt sẽ cộng thêm {expectedFeeDeltaVnd.toLocaleString("vi-VN")}đ phí giao vào đơn.</p>
      )}
      <label className="sr-only" htmlFor={`change-note-${requestId}`}>Lời nhắn cho khách</label>
      <Textarea id={`change-note-${requestId}`} rows={2} value={reply} maxLength={500} onChange={(e) => setReply(e.target.value)}
        placeholder="Lời nhắn cho khách (bắt buộc khi không đồng ý)"
        className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text placeholder:text-text-muted" />
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button variant="ghost" type="button" disabled={busy !== null} onClick={() => void decide(true)}
          className="py-0 inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-success px-4 text-body-sm font-bold text-white disabled:opacity-40 hover:bg-success">
          {busy === "approve" && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />} Đồng ý cập nhật
        </Button>
        <Button variant="ghost" type="button" disabled={busy !== null || reply.trim().length < 3} onClick={() => void decide(false)}
          className="py-0 inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-danger px-4 text-body-sm font-bold text-white disabled:opacity-40 hover:bg-danger">
          {busy === "reject" && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />} Không đồng ý
        </Button>
      </div>
    </div>
  )
}
