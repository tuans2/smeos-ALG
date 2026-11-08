"use client"

import React, { useState } from "react"
import { AlertTriangle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { usePromptDialog } from "@/components/ui/prompt-dialog"
import { apiSend, usePagedList } from "@/components/greeting-card/greeting-api"
import { vnd } from "./admin-order-types"

interface PaymentEvent {
  id: string
  external_id: string
  amount_vnd: number
  content: string
  note: string | null
  transaction_at: string | null
  created_at: string
}

/** Giao dịch ngân hàng không tự khớp được đơn (sai nội dung, chuyển thừa, đơn đã huỷ) — Điều hành xử lý tay. */
export function UnmatchedPaymentsPanel() {
  const events = usePagedList<PaymentEvent>("/api/v1/greeting-card/payment-events?status=UNMATCHED", 10)
  const [error, setError] = useState<string | null>(null)
  const [askText, promptDialog] = usePromptDialog()

  async function markHandled(e: PaymentEvent) {
    const note = await askText({
      title: `Đánh dấu giao dịch #${e.external_id} đã xử lý?`,
      label: "Ghi chú cách đã xử lý",
      placeholder: "Vd: đã hoàn tiền, đã ghi thu tay cho đơn …",
      confirmLabel: "Đánh dấu đã xử lý",
    })
    if (!note) return
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/payment-events/${e.id}/handle`, "POST", { note }, "Không cập nhật được giao dịch")
      await events.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được giao dịch")
    }
  }

  if (events.isLoading || events.items.length === 0) return null

  return (
    <section className="bg-surface rounded-2xl border border-warning/40 shadow-sm overflow-hidden">
      {promptDialog}
      <div className="p-4 border-b border-border flex items-center gap-2 bg-warning-bg/30">
        <AlertTriangle size={18} className="text-warning" />
        <h3 className="text-body font-extrabold text-text">Giao dịch chưa khớp đơn ({events.items.length}{events.hasMore ? "+" : ""})</h3>
      </div>
      {error && <p role="alert" className="px-4 pt-3 text-body-sm text-danger">{error}</p>}
      <ul className="divide-y divide-border">
        {events.items.map((e) => (
          <li key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 justify-between text-body-sm">
            <div className="min-w-0">
              <div className="font-bold text-text">{vnd(e.amount_vnd)} · <span className="font-mono text-text-muted">#{e.external_id}</span></div>
              <div className="text-text-muted break-words">“{e.content}”</div>
              {e.note && <div className="text-caption text-warning font-medium">{e.note}</div>}
              <div className="text-caption text-text-muted">{new Date(e.transaction_at ?? e.created_at).toLocaleString("vi-VN")}</div>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => void markHandled(e)} className="shrink-0">Đánh dấu đã xử lý</Button>
          </li>
        ))}
      </ul>
      {events.hasMore && (
        <div className="p-3 border-t border-border flex justify-center">
          <Button type="button" variant="outline" size="sm" onClick={() => void events.loadMore()}>Tải thêm</Button>
        </div>
      )}
    </section>
  )
}
