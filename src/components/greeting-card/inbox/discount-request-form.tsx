"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icons"
import { apiSend } from "@/components/greeting-card/greeting-api"

/** Sale xin giảm giá cho đơn: theo % hoặc số tiền, kèm lý do — gửi thẳng Điều hành. */
export function DiscountRequestForm({ orderId, onSent }: { orderId: string; onSent: () => void }) {
  const [unit, setUnit] = useState<"PERCENT" | "VND">("PERCENT")
  const [value, setValue] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const n = Number(value.replace(/\D/g, ""))

  async function send() {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/orders/${orderId}/discount-request`, "POST", {
        ...(unit === "PERCENT" ? { percent: n } : { amount_vnd: n }), reason: reason.trim(),
      }, "Không gửi được yêu cầu giảm giá")
      setValue("")
      setReason("")
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không gửi được yêu cầu giảm giá")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <div role="group" aria-label="Đơn vị giảm" className="inline-flex rounded-xl border border-border p-0.5">
          {(["PERCENT", "VND"] as const).map((u) => (
            <Button variant="ghost" key={u} type="button" aria-pressed={unit === u} onClick={() => setUnit(u)}
              className={`py-0 gap-0 h-10 min-w-11 rounded-lg px-3 text-body-sm font-bold ${unit === u ? "bg-primary text-white hover:bg-primary" : "text-text-muted"}`}>
              {u === "PERCENT" ? "%" : "đ"}
            </Button>
          ))}
        </div>
        <label className="sr-only" htmlFor={`discount-${orderId}`}>Mức xin giảm</label>
        <Input id={`discount-${orderId}`} inputMode="numeric" value={value} onChange={(e) => setValue(e.target.value)}
          placeholder={unit === "PERCENT" ? "VD: 10" : "VD: 50000"}
          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 text-body text-text" />
      </div>
      <label className="sr-only" htmlFor={`reason-${orderId}`}>Lý do xin giảm</label>
      <Textarea id={`reason-${orderId}`} rows={2} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)}
        placeholder="Lý do (vd. khách quen đặt lần 3)"
        className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-body text-text placeholder:text-text-muted" />
      <Button variant="primary" type="button" onClick={() => void send()} disabled={busy || !(n > 0) || reason.trim().length < 3}
        className="py-0 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-body-sm font-bold text-white hover:bg-primary-dark disabled:opacity-40">
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        Gửi Điều hành duyệt
      </Button>
    </div>
  )
}
