"use client"

import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { Shuffle } from "@/components/ui/icon-set/shuffle"
import { Button } from "@/components/ui/button"
import { FlowerImage } from "@/components/greeting-card/flower-image"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { formatDateTime } from "@/lib/i18n/formatters"
import { FLOWER_NOTE_MAX, type CustomerFlowerView, type FlowerChoice } from "@/modules/greeting-card/domain/flower-substitute"

export interface FlowerSubstituteData {
  pending: CustomerFlowerView | null
  history: CustomerFlowerView[]
}

/**
 * Tiệm thiếu một loại hoa phụ và đề xuất hoa thay thế kèm ảnh tiệm chụp (checklist ALG 5.14): khách
 * đồng ý hoặc không đồng ý. Đã trả lời → hiện lại lựa chọn và thời điểm (bằng chứng đồng ý).
 */
export function FlowerSubstitutePanel({ orderCode, proof, flower, onChanged }: {
  orderCode: string
  proof: { sendCode?: string | null | undefined; last4?: string | null | undefined }
  flower: FlowerSubstituteData
  onChanged: () => void
}) {
  const p = flower.pending
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!p) {
    const last = flower.history[0]
    if (!last?.choiceLabel) return null
    return (
      <div role="status" className="rounded-2xl border border-border bg-surface-muted p-4 flex flex-col gap-1 text-body-sm">
        <p className="font-bold text-text flex items-center gap-2"><Shuffle size={16} aria-hidden="true" /> Đổi hoa</p>
        <p className="text-text">
          {last.choiceLabel}: {last.originalFlower} → {last.replacementFlower} <span className="text-text-muted">· {formatDateTime(last.answeredAt)}</span>
        </p>
        {last.choice === "DECLINE" && <p className="text-text-muted">Tiệm sẽ liên hệ bạn trước khi thực hiện đơn.</p>}
      </div>
    )
  }

  async function answer(choice: FlowerChoice) {
    if (!p) return
    setBusy(true)
    setError(null)
    try {
      const qs = proof.sendCode ? `?link=${encodeURIComponent(proof.sendCode)}` : ""
      await apiSend(`/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}/flower-substitute-response${qs}`, "POST", {
        proposalId: p.id, choice, ...(note.trim() ? { note: note.trim() } : {}),
        ...(!proof.sendCode && proof.last4 ? { phoneLast4: proof.last4 } : {}),
      }, "Chưa gửi được câu trả lời")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được câu trả lời")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="flower-substitute-title" className="rounded-2xl border border-warning/30 bg-warning-bg p-4 flex flex-col gap-3">
      <h3 id="flower-substitute-title" className="text-body font-extrabold text-warning-text flex items-center gap-2">
        <Shuffle size={18} aria-hidden="true" /> Tiệm xin phép đổi một thành phần
      </h3>
      <p className="text-body-sm text-text">
        Mẫu <strong>{p.productName}</strong>: thay <strong>{p.originalFlower}</strong> bằng <strong>{p.replacementFlower}</strong>
        {p.replacementColor ? ` (${p.replacementColor})` : ""}. {p.reason}
      </p>
      {p.photoUrl && (
        <FlowerImage src={p.photoUrl} alt={`Ảnh ${p.replacementFlower} tiệm chụp`} className="aspect-square w-full max-w-xs rounded-xl" sizes="320px" fallback="icon" />
      )}
      <p className="text-caption text-text-muted">Tổng tiền đơn giữ nguyên. Hoa chủ đạo và kiểu dáng không đổi.</p>

      <label className="sr-only" htmlFor="flower-substitute-note">Ghi chú cho tiệm</label>
      <Textarea id="flower-substitute-note" rows={2} maxLength={FLOWER_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy}
        placeholder="Ghi chú cho tiệm (không bắt buộc)"
        className="w-full rounded-xl border border-border bg-surface p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />

      {error && <p role="alert" className="text-danger text-caption">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void answer("DECLINE")} className="h-11 flex-1">
          Không đồng ý
        </Button>
        <Button type="button" disabled={busy} onClick={() => void answer("ACCEPT")} className="h-11 flex-1">
          {busy ? "Đang gửi..." : "Đồng ý đổi hoa"}
        </Button>
      </div>
    </section>
  )
}
