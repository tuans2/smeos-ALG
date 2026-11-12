"use client"

import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { Loader2, Send, X } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { MAX_MESSAGE_LENGTH } from "@/modules/greeting-card/domain/internal-message"
import { DiscountRequestForm } from "./discount-request-form"

interface Recipients {
  roles: Array<{ role: string; label: string }>
  members: Array<{ userId: string; name: string }>
}

interface Props {
  target: { orderId?: string | null | undefined; sessionId?: string | null | undefined }
  stepKey: string
  replyTo: { id: string; senderName: string } | null
  onCancelReply: () => void
  onSent: () => void
}

/** Ô soạn tin: chọn người nhận (hoặc đang trả lời ai), Ctrl/⌘ + Enter để gửi. */
export function MessageComposer({ target, stepKey, replyTo, onCancelReply, onSent }: Props) {
  const recipients = useApi<{ data: Recipients }>("/api/v1/greeting-card/messages/recipients")
  const [to, setTo] = useState("ROLE:ADMIN")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Xin giảm giá chỉ cho đơn đã đặt (link chưa có đơn thì chưa có giá chốt)
  const [mode, setMode] = useState<"MESSAGE" | "DISCOUNT">("MESSAGE")

  async function send() {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    setError(null)
    const [kind, value] = to.split(":")
    try {
      await apiSend("/api/v1/greeting-card/messages", "POST", {
        ...(target.orderId ? { orderId: target.orderId } : { sessionId: target.sessionId }),
        stepKey,
        to: kind === "ROLE" ? { kind, role: value } : kind === "USER" ? { kind, userId: value } : { kind: "OWNER_SALE" },
        body: text,
        ...(replyTo ? { replyToId: replyTo.id } : {}),
      }, "Không gửi được tin nhắn")
      setBody("")
      onCancelReply()
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được tin nhắn")
    } finally {
      setSending(false)
    }
  }

  const modeSwitch = target.orderId && !replyTo && (
    <div role="group" aria-label="Loại tin" className="grid grid-cols-2 gap-1 rounded-xl bg-surface-alt p-1">
      {(["MESSAGE", "DISCOUNT"] as const).map((m) => (
        <Button variant="ghost" key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}
          className={`px-0 py-0 gap-0 h-10 rounded-lg text-body-sm font-bold ${mode === m ? "bg-surface text-primary shadow-xs hover:bg-surface" : "text-text-muted"}`}>
          {m === "MESSAGE" ? "Tin nhắn" : "Xin giảm giá"}
        </Button>
      ))}
    </div>
  )
  if (mode === "DISCOUNT" && target.orderId && !replyTo) {
    return (
      <div className="flex flex-col gap-2 p-3">
        {modeSwitch}
        <DiscountRequestForm orderId={target.orderId} onSent={() => { setMode("MESSAGE"); onSent() }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {modeSwitch}
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">{error}</p>}
      {replyTo ? (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-primary/5 px-3 py-1.5 text-body-sm">
          <span>Trả lời <strong>{replyTo.senderName}</strong></span>
          <Button variant="ghost" type="button" onClick={onCancelReply} aria-label="Huỷ trả lời" className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-surface-alt">
            <X size={16} aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <label className="flex items-center gap-2 text-body-sm">
          <span className="shrink-0 font-semibold text-text-muted">Gửi cho</span>
          <NativeSelect value={to} onChange={(e) => setTo(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-body-sm text-text">
            {(recipients.data?.data.roles ?? [{ role: "ADMIN", label: "Điều hành" }]).map((r) => (
              <option key={r.role} value={`ROLE:${r.role}`}>{r.label}</option>
            ))}
            <option value="OWNER_SALE">Sale phụ trách đơn</option>
            {(recipients.data?.data.members.length ?? 0) > 0 && (
              <optgroup label="Một người cụ thể">
                {recipients.data!.data.members.map((m) => <option key={m.userId} value={`USER:${m.userId}`}>{m.name}</option>)}
              </optgroup>
            )}
          </NativeSelect>
        </label>
      )}
      <div className="flex items-end gap-2">
        <label className="sr-only" htmlFor="message-body">Nội dung tin nhắn</label>
        <Textarea
          id="message-body"
          value={body}
          maxLength={MAX_MESSAGE_LENGTH}
          rows={2}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Nhập tin nhắn…"
          className="max-h-40 min-h-11 flex-1 resize-y rounded-xl border border-border bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted"
        />
        <Button variant="primary" type="button" onClick={() => void send()} disabled={!body.trim() || sending} aria-label="Gửi tin nhắn"
          className="px-0 py-0 text-[length:inherit] font-[inherit] gap-0 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white hover:bg-primary-dark disabled:opacity-40">
          {sending ? <Loader2 size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send size={18} aria-hidden="true" />}
        </Button>
      </div>
    </div>
  )
}
