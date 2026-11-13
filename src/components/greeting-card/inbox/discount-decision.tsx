"use client"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Loader2 } from "@/components/ui/icons"
import { apiSend } from "@/components/greeting-card/greeting-api"

interface Props {
  requestId: string
  baseTotalVnd: number
  requestedVnd: number
  percent: number | null
  maxPercent: number
  onDone: (message: string) => void
}

type Choice = "AS_ASKED" | "OTHER" | "REJECT"
const vnd = (n: number) => `${n.toLocaleString("vi-VN")}đ`

/** Điều hành duyệt đúng mức xin, duyệt mức khác (trong trần), hoặc từ chối — luôn kèm ghi chú cho sale. */
export function DiscountDecision({ requestId, baseTotalVnd, requestedVnd, percent, maxPercent, onDone }: Props) {
  const [choice, setChoice] = useState<Choice>("AS_ASKED")
  const [otherPercent, setOtherPercent] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const otherVnd = Math.floor((baseTotalVnd * Number(otherPercent || 0)) / 100 / 1000) * 1000

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/discount-requests/${requestId}/decision`, "POST", {
        approve: choice !== "REJECT",
        ...(choice === "OTHER" ? { percent: Number(otherPercent) } : {}),
        note: note.trim(),
      }, "Không lưu được quyết định")
      onDone(choice === "REJECT" ? "Đã từ chối và báo lại cho sale." : "Đã duyệt — giá chốt của đơn đã cập nhật và sale đã nhận kết quả.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được quyết định")
    } finally {
      setBusy(false)
    }
  }

  const option = (value: Choice, label: React.ReactNode) => (
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-body-sm ${choice === value ? "border-primary bg-primary/5" : "border-border"}`}>
      <RadioGroupItem value={value} />
      <span>{label}</span>
    </label>
  )

  return (
    <fieldset className="flex flex-col gap-2" disabled={busy}>
      <legend className="sr-only">Quyết định giảm giá</legend>
      <RadioGroup aria-label="Quyết định giảm giá" value={choice} onValueChange={(v) => setChoice(v as Choice)} className="flex flex-col gap-2">
      {option("AS_ASKED", <>Duyệt như xin: <strong>{percent ? `${percent}% · ` : ""}{vnd(requestedVnd)}</strong></>)}
      {option("OTHER", (
        <span className="flex flex-wrap items-center gap-2">
          Duyệt mức khác
          {choice === "OTHER" && (
            <>
              <Input aria-label="Phần trăm duyệt" type="number" inputMode="numeric" min={1} max={maxPercent} value={otherPercent}
                onChange={(e) => setOtherPercent(e.target.value)}
                className="h-9 w-16 rounded-lg border border-border bg-surface px-2 text-right text-body-sm" />
              % {otherVnd > 0 && <span className="text-text-muted">= {vnd(otherVnd)}</span>}
            </>
          )}
        </span>
      ))}
      {option("REJECT", "Không duyệt")}
      </RadioGroup>
      <p className="text-caption text-text-muted">Tối đa {maxPercent}% · giá đơn {vnd(baseTotalVnd)}</p>
      <label className="sr-only" htmlFor={`note-${requestId}`}>Ghi chú cho sale</label>
      <Textarea id={`note-${requestId}`} rows={2} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)}
        placeholder={choice === "REJECT" ? "Lý do không duyệt (bắt buộc)" : "Ghi chú cho sale (vd. Duyệt 5% thay vì 10%)"}
        className="min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-body-sm text-text placeholder:text-text-muted" />
      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">{error}</p>}
      <Button variant="ghost" type="button" onClick={() => void submit()}
        disabled={(choice === "OTHER" && !(Number(otherPercent) >= 1)) || (choice === "REJECT" && note.trim().length < 3)}
        className={`py-0 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-body-sm font-bold text-white disabled:opacity-40 ${choice === "REJECT" ? "bg-danger hover:bg-danger" : "bg-success hover:bg-success"}`}>
        {busy && <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {choice === "REJECT" ? "Xác nhận không duyệt" : "Xác nhận duyệt"}
      </Button>
    </fieldset>
  )
}
