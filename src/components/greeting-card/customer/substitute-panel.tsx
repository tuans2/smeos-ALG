"use client"

import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { Check, Shuffle } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { SUBSTITUTE_NOTE_MAX, type CustomerSubstituteView, type SubstituteChoice } from "@/modules/greeting-card/domain/substitute-proposal"

export interface SubstituteData {
  pending: CustomerSubstituteView | null
  history: CustomerSubstituteView[]
}

const when = (iso: string | null) => {
  const d = iso ? new Date(iso) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : ""
}

/**
 * Tiệm không làm được mẫu khách chọn và đề xuất mẫu khác: khách chọn một mẫu, nhờ tiệm chọn mẫu
 * tương đương, hoặc xin huỷ đơn. Đã trả lời → hiện lại lựa chọn + thời điểm (bằng chứng đồng ý).
 */
export function SubstitutePanel({
  orderCode,
  proof,
  substitute,
  onChanged,
}: {
  orderCode: string
  proof: { sendCode?: string | null | undefined; last4?: string | null | undefined }
  substitute: SubstituteData
  onChanged: () => void
}) {
  const p = substitute.pending
  const [choice, setChoice] = useState<SubstituteChoice | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!p) {
    const last = substitute.history[0]
    if (!last?.choiceLabel) return null
    return (
      <div role="status" className="rounded-2xl border border-border bg-surface-alt p-4 flex flex-col gap-1 text-body-sm">
        <p className="font-bold text-text flex items-center gap-2"><Shuffle size={16} aria-hidden="true" /> Đổi sản phẩm</p>
        <p className="text-text">
          {last.choiceLabel}{last.chosenName ? `: ${last.chosenName}` : ""} <span className="text-text-muted">· {when(last.answeredAt)}</span>
        </p>
        <p className="text-text-muted">Mẫu ban đầu: {last.originalName}</p>
        {last.choice === "CANCEL" && <p className="text-text-muted">Tiệm sẽ liên hệ để huỷ đơn và hoàn tiền theo chính sách đã thoả thuận.</p>}
      </div>
    )
  }

  const invalid =
    choice === null ? "Vui lòng chọn một cách xử lý" : choice === "OPTION" && !productId ? "Vui lòng chọn một mẫu" : choice === "CANCEL" && !note.trim() ? "Vui lòng cho tiệm biết lý do huỷ" : null

  async function submit() {
    if (!p || !choice) return
    setBusy(true)
    setError(null)
    try {
      const qs = proof.sendCode ? `?link=${encodeURIComponent(proof.sendCode)}` : ""
      await apiSend(`/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}/substitute-response${qs}`, "POST", {
        proposalId: p.id, choice, ...(choice === "OPTION" && productId ? { productId } : {}), ...(note.trim() ? { note: note.trim() } : {}),
        ...(!proof.sendCode && proof.last4 ? { phoneLast4: proof.last4 } : {}),
      }, "Chưa gửi được lựa chọn")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được lựa chọn")
    } finally {
      setBusy(false)
    }
  }

  const pick = (c: SubstituteChoice, id: string | null = null) => {
    setChoice(c)
    setProductId(id)
  }
  const radio = (on: boolean) => `flex h-auto min-h-11 w-full items-center justify-start gap-2 font-normal rounded-xl border px-3 py-2 text-left text-body-sm ${on ? "border-primary bg-primary/5 hover:bg-primary/5" : "border-border"}`

  return (
    <section aria-labelledby="substitute-title" className="rounded-2xl border border-warning/30 bg-warning-bg p-4 flex flex-col gap-3">
      <h3 id="substitute-title" className="text-body font-extrabold text-warning-text flex items-center gap-2">
        <Shuffle size={18} aria-hidden="true" /> Tiệm cần bạn chọn lại sản phẩm
      </h3>
      <p className="text-body-sm text-text">
        Mẫu <strong>{p.originalName}</strong> tạm thời không làm được: {p.reason}
      </p>
      <p className="text-caption text-text-muted">Tổng tiền đơn giữ nguyên. Chọn một mẫu dưới đây, hoặc nhờ tiệm chọn mẫu tương đương.</p>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {p.options.map((o) => {
          const on = choice === "OPTION" && productId === o.productId
          return (
            <li key={o.productId}>
              <Button variant="outline" type="button" aria-pressed={on} disabled={busy} onClick={() => pick("OPTION", o.productId)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] relative flex w-full flex-col gap-1 rounded-xl border bg-surface p-2 text-left hover:bg-surface ${on ? "border-primary ring-2 ring-primary/40" : "border-border"}`}>
                <FlowerImage src={o.imageUrl} driveLink={o.driveLink} alt={o.name} className="aspect-square w-full rounded-lg" sizes="(max-width: 640px) 50vw, 200px" fallback="icon" />
                <span className="text-body-sm font-bold text-text line-clamp-2">{o.name}</span>
                {on && <Check size={18} className="absolute right-3 top-3 rounded-full bg-primary text-primary-foreground" aria-hidden="true" />}
              </Button>
            </li>
          )
        })}
      </ul>

      <Button variant="ghost" type="button" aria-pressed={choice === "SHOP_DECIDES"} disabled={busy} onClick={() => pick("SHOP_DECIDES")} className={radio(choice === "SHOP_DECIDES")}>
        Nhờ tiệm chọn mẫu tương đương
      </Button>
      <Button variant="ghost" type="button" aria-pressed={choice === "CANCEL"} disabled={busy} onClick={() => pick("CANCEL")} className={radio(choice === "CANCEL")}>
        Tôi muốn huỷ đơn
      </Button>

      <label className="sr-only" htmlFor="substitute-note">Ghi chú cho tiệm</label>
      <Textarea id="substitute-note" rows={2} maxLength={SUBSTITUTE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
        placeholder={choice === "CANCEL" ? "Lý do huỷ (bắt buộc)" : "Ghi chú cho tiệm (không bắt buộc), vd. ưu tiên tông hồng nhạt"}
        className="w-full rounded-xl border border-border bg-surface p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />

      {error && <p role="alert" className="text-danger text-caption">{error}</p>}
      <Button type="button" disabled={!!invalid || busy} title={invalid ?? undefined} onClick={() => void submit()} className="h-11">
        {busy ? "Đang gửi..." : "Gửi lựa chọn cho tiệm"}
      </Button>
    </section>
  )
}
