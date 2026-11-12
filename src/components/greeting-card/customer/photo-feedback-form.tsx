"use client"

import React, { useState } from "react"
import { MessageSquare } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { apiSend } from "@/components/greeting-card/greeting-api"

/** Khách góp ý ảnh thành phẩm thay vì đồng ý (checklist ALG 5.13): đồng hồ tự duyệt dừng, cửa hàng chỉnh và gửi lại ảnh. */
export function PhotoFeedbackForm({ orderCode, sendCode, disabled, onSent }: { orderCode: string; sendCode?: string | null | undefined; disabled: boolean; onSent: () => void }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    if (message.trim().length < 3) return setError("Nhập góp ý (ít nhất 3 ký tự)")
    setSending(true)
    setError(null)
    try {
      const url = `/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}/photo-feedback${sendCode ? `?link=${encodeURIComponent(sendCode)}` : ""}`
      await apiSend(url, "POST", { message: message.trim() })
      onSent()
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Không gửi được góp ý, vui lòng thử lại")
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => setOpen(true)} className="h-10 w-full gap-1.5 rounded-xl font-bold">
        <MessageSquare size={16} aria-hidden="true" />
        <span>Góp ý để cửa hàng chỉnh</span>
      </Button>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <Textarea aria-label="Góp ý về ảnh thành phẩm" value={message} maxLength={500} rows={3} placeholder="VD: Cho thêm hoa trắng, bó tròn hơn" onChange={(e) => setMessage(e.target.value)} />
      {error && <p className="text-caption text-danger" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={sending}>Huỷ</Button>
        <Button type="button" size="sm" onClick={() => void send()} disabled={sending || disabled} className="flex-1">
          {sending ? "Đang gửi..." : "Gửi góp ý"}
        </Button>
      </div>
    </div>
  )
}
