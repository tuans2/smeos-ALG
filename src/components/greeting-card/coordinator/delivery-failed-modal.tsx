"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import React, { useState } from "react"
import { PackageX } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { apiSend } from "@/components/greeting-card/greeting-api"
import {
  DELIVERY_FAILURE_LABEL,
  DELIVERY_FAILURE_REASONS,
  FAILURE_NOTE_MAX,
  deliveryFailureError,
  type DeliveryFailureReason,
} from "@/modules/greeting-card/domain/delivery-failure"

/**
 * Điều phối ghi lần giao không thành công: lý do, ghi chú (vd. đã gọi mấy cuộc), có tính phí giao
 * lại theo cài đặt của tiệm không. Đơn chờ hẹn lại; khách thấy và đổi được giờ/địa chỉ giao.
 */
export function DeliveryFailedModal({ orderId, orderCode, onClose, onDone }: { orderId: string; orderCode: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState<DeliveryFailureReason>("NO_ANSWER")
  const [note, setNote] = useState("")
  const [chargeFee, setChargeFee] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const invalid = deliveryFailureError({ reason, note })

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await apiSend(`/api/v1/greeting-card/orders/${orderId}/delivery-failed`, "POST", { reason, note: note.trim(), chargeFee }, "Chưa ghi được")
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa ghi được")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose() }} size="sm"
      title={<span className="flex items-center gap-2"><PackageX size={18} className="text-warning-text" aria-hidden="true" /> Giao không thành công — #{orderCode}</span>}>
      <div className="flex flex-col gap-4">
        <p className="text-body-sm text-text-muted">Đơn chuyển sang <strong>chờ giao lại</strong>. Khách được báo và có thể đổi giờ hoặc địa chỉ giao trên trang theo dõi.</p>

        <fieldset className="flex flex-col gap-2" disabled={busy}>
          <legend className="text-body-sm font-bold text-text mb-1">Lý do</legend>
          <RadioGroup aria-label="Lý do" value={reason} onValueChange={(v) => setReason(v as DeliveryFailureReason)} className="flex flex-col gap-2">
          {DELIVERY_FAILURE_REASONS.map((r) => (
            <label key={r} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-body-sm ${reason === r ? "border-primary bg-primary/5" : "border-border"}`}>
              <RadioGroupItem value={r} />
              <span>{DELIVERY_FAILURE_LABEL[r]}</span>
            </label>
          ))}
          </RadioGroup>
        </fieldset>

        <label className="sr-only" htmlFor="delivery-failed-note">Ghi chú</label>
        <Textarea id="delivery-failed-note" rows={2} maxLength={FAILURE_NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={reason === "OTHER" ? "Ghi rõ lý do (bắt buộc)" : "Ghi chú: đã gọi mấy cuộc, giờ nào, người nhận hẹn lại lúc nào…"}
          className="w-full rounded-xl border border-border bg-surface-muted p-3 text-body-sm text-text resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />

        <label className="flex min-h-11 items-start gap-2 text-body-sm text-text">
          <Checkbox checked={chargeFee} onCheckedChange={(checked) => setChargeFee((checked === true))} className="mt-1" />
          <span>Tính phí giao lại theo cài đặt của tiệm <span className="text-text-muted">(bỏ chọn nếu lỗi do cửa hàng / shipper)</span></span>
        </label>

        {error && <p role="alert" className="text-danger text-caption">{error}</p>}
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9 text-caption">Huỷ</Button>
          <Button type="button" size="sm" disabled={!!invalid || busy} title={invalid ?? undefined} onClick={() => void submit()} className="h-9 text-caption">
            {busy ? "Đang lưu..." : "Xác nhận giao không thành công"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
