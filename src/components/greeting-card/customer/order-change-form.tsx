"use client"

import { NativeSelect } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import React, { useId, useState } from "react"
import { Send, X } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend } from "@/components/greeting-card/greeting-api"
import type { ShippingConfig } from "@/modules/greeting-card/domain/brochure-pricing"
import type { AddressParts } from "@/modules/greeting-card/domain/delivery-address"
import { earliestDeliveryDate } from "@/modules/greeting-card/domain/delivery-schedule"
import { ORDER_FIELD_MAX } from "@/modules/greeting-card/domain/greeting-card-rules"
import { DELIVERY_NOTE_MAX, MAP_URL_MAX } from "@/modules/greeting-card/domain/delivery-note"
import { CHANGE_NOTE_MAX, type OrderChangeInput, type OrderChangeSnapshot } from "@/modules/greeting-card/domain/order-change-request"
import { AddressFields } from "./address-fields"
import { DeliveryTimePicker } from "./delivery-time-picker"
import { ViDateInput } from "./vi-date-input"

const INPUT = "w-full min-w-0 h-11 px-3 rounded-lg border border-border bg-bg text-title font-normal text-text placeholder:text-body placeholder:text-text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
const LABEL = "block text-body-sm font-bold text-text mb-1"
const EMPTY_PARTS: AddressParts = { houseNumber: "", street: "", ward: "", province: "" }

/** Chỉ gửi ô khách thực sự đổi — máy chủ so lại với đơn và báo nếu không có gì đổi. */
function changedFields(current: OrderChangeSnapshot, v: Draft): OrderChangeInput {
  const out: OrderChangeInput = {}
  if (v.deliveryDate !== current.deliveryDate) out.deliveryDate = v.deliveryDate
  if (v.deliveryTimeSlot !== current.deliveryTimeSlot) out.deliveryTimeSlot = v.deliveryTimeSlot
  if (v.recipientName.trim() !== current.recipientName) out.recipientName = v.recipientName
  if (v.recipientPhone.trim()) out.recipientPhone = v.recipientPhone
  if (v.addressTouched) out.addressParts = v.addressParts
  if (v.shippingZoneId !== (current.shippingZoneId ?? "")) out.shippingZoneId = v.shippingZoneId
  if (v.cardMessage.trim() !== current.cardMessage) out.cardMessage = v.cardMessage
  if (v.deliveryNote.trim() !== current.deliveryNote) out.deliveryNote = v.deliveryNote
  if (v.mapUrl.trim() !== current.mapUrl) out.mapUrl = v.mapUrl
  if (v.note.trim()) out.note = v.note
  return out
}

type Draft = Omit<OrderChangeSnapshot, "addressParts" | "shippingZoneId" | "shippingZoneName" | "deliveryAddress"> & {
  addressParts: AddressParts
  addressTouched: boolean
  shippingZoneId: string
  note: string
}

/** Form xin đổi thông tin đơn: điền sẵn thông tin hiện tại; SĐT người nhận để trống = giữ số cũ. */
export function OrderChangeForm({
  orderCode,
  proof,
  current,
  shipping,
  cardLocked = false,
  onClose,
  onSent,
}: {
  orderCode: string
  proof: { sendCode?: string | null | undefined; last4?: string | null | undefined }
  current: OrderChangeSnapshot
  shipping: ShippingConfig
  cardLocked?: boolean
  onClose: () => void
  onSent: () => void
}) {
  const uid = useId()
  const [v, setV] = useState<Draft>({
    ...current,
    recipientPhone: "",
    addressParts: current.addressParts ?? EMPTY_PARTS,
    addressTouched: false,
    shippingZoneId: current.shippingZoneId ?? "",
    note: "",
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (patch: Partial<Draft>) => setV((prev) => ({ ...prev, ...patch }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const qs = proof.sendCode ? `?link=${encodeURIComponent(proof.sendCode)}` : ""
      await apiSend(`/api/v1/public/brochure/tracking/${encodeURIComponent(orderCode)}/change-request${qs}`, "POST", {
        ...changedFields(current, v),
        ...(!proof.sendCode && proof.last4 ? { phoneLast4: proof.last4 } : {}),
      }, "Chưa gửi được yêu cầu thay đổi")
      onSent()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chưa gửi được yêu cầu thay đổi")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-body font-extrabold text-text">Yêu cầu thay đổi thông tin</h3>
          <p className="text-caption text-text-muted">Sửa ô bạn muốn đổi rồi gửi. Cửa hàng xác nhận xong, đơn mới được cập nhật.</p>
        </div>
        <Button variant="ghost" type="button" onClick={onClose} aria-label="Đóng" className="text-[length:inherit] h-auto font-[inherit] gap-0 p-2 rounded-lg text-text-muted hover:bg-surface-alt"><X size={18} /></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-date`} className={LABEL}>Ngày giao</label>
          <ViDateInput id={`${uid}-date`} min={earliestDeliveryDate(shipping)} value={v.deliveryDate} onChange={(deliveryDate) => set({ deliveryDate })} className={INPUT} />
        </div>
        <div>
          <label htmlFor={`${uid}-slot`} className={LABEL}>Giờ giao</label>
          <DeliveryTimePicker id={`${uid}-slot`} date={v.deliveryDate} value={v.deliveryTimeSlot} shipping={shipping} inputClassName={INPUT} onChange={(slot) => set({ deliveryTimeSlot: slot })} />
        </div>
        <div>
          <label htmlFor={`${uid}-rname`} className={LABEL}>Tên người nhận</label>
          <Input id={`${uid}-rname`} value={v.recipientName} maxLength={ORDER_FIELD_MAX.name} onChange={(e) => set({ recipientName: e.target.value })} className={INPUT} />
        </div>
        <div>
          <label htmlFor={`${uid}-rphone`} className={LABEL}>SĐT người nhận mới</label>
          <Input id={`${uid}-rphone`} type="tel" inputMode="tel" maxLength={15} placeholder="Để trống nếu không đổi" value={v.recipientPhone} onChange={(e) => set({ recipientPhone: e.target.value })} className={INPUT} />
        </div>
      </div>

      <AddressFields idPrefix={`${uid}-addr`} value={v.addressParts} inputClassName={INPUT} onChange={(parts) => set({ addressParts: parts, addressTouched: true })} />
      {!current.addressParts && !v.addressTouched && (
        <p className="-mt-2 text-caption text-text-muted">Địa chỉ hiện tại: {current.deliveryAddress || "—"}. Chỉ điền các ô trên nếu muốn đổi địa chỉ.</p>
      )}

      {shipping.zones.length > 0 && (
        <div>
          <label htmlFor={`${uid}-zone`} className={LABEL}>Khu vực giao</label>
          <NativeSelect id={`${uid}-zone`} value={v.shippingZoneId} onChange={(e) => set({ shippingZoneId: e.target.value })} className={INPUT}>
            {!v.shippingZoneId && <option value="">Chọn khu vực</option>}
            {shipping.zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {z.feeVnd.toLocaleString("vi-VN")}đ</option>)}
          </NativeSelect>
          <p className="mt-1 text-caption text-text-muted">Khu vực mới phí cao hơn thì phần chênh được cộng vào đơn; phí thấp hơn thì giữ nguyên số tiền.</p>
        </div>
      )}

      {cardLocked ? (
        <p className="text-caption text-text-muted">Thiệp đã in kèm hoa nên không đổi lời nhắn được nữa.</p>
      ) : (
      <div>
        <label htmlFor={`${uid}-card`} className={LABEL}>Nội dung thiệp mừng / băng rôn</label>
        <Textarea id={`${uid}-card`} rows={2} value={v.cardMessage} maxLength={ORDER_FIELD_MAX.cardMessage} onChange={(e) => set({ cardMessage: e.target.value })} className={`${INPUT} h-auto p-3 resize-none`} />
        <p className="mt-1 text-right text-caption text-text-muted">{v.cardMessage.length}/{ORDER_FIELD_MAX.cardMessage} ký tự</p>
      </div>
      )}
      <div>
        <label htmlFor={`${uid}-dnote`} className={LABEL}>Ghi chú cho người giao hoa</label>
        <Input id={`${uid}-dnote`} value={v.deliveryNote} maxLength={DELIVERY_NOTE_MAX} onChange={(e) => set({ deliveryNote: e.target.value })} className={INPUT} />
      </div>
      <div>
        <label htmlFor={`${uid}-map`} className={LABEL}>Link vị trí trên Google Maps</label>
        <Input id={`${uid}-map`} type="url" inputMode="url" value={v.mapUrl} maxLength={MAP_URL_MAX} placeholder="Để trống nếu không có" onChange={(e) => set({ mapUrl: e.target.value })} className={INPUT} />
      </div>
      <div>
        <label htmlFor={`${uid}-note`} className={LABEL}>Lời nhắn cho cửa hàng (không bắt buộc)</label>
        <Input id={`${uid}-note`} value={v.note} maxLength={CHANGE_NOTE_MAX} placeholder="VD: Người nhận đi công tác, nhờ giao chiều" onChange={(e) => set({ note: e.target.value })} className={INPUT} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-body-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy} className="h-12 w-full gap-2 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark">
        <Send size={18} aria-hidden="true" />
        {busy ? "Đang gửi..." : "Gửi yêu cầu thay đổi"}
      </Button>
    </form>
  )
}
