"use client"

import type { AddressParts } from "@/modules/greeting-card/domain/delivery-address"
import { useEffect } from "react"
import { useSavedState } from "./use-saved-state"
import { readSavedBuyer, rememberBuyer } from "./saved-buyer"

const EMPTY = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  recipientName: "",
  recipientPhone: "",
  deliveryDate: "",
  deliveryTimeSlot: "",
  addressParts: { houseNumber: "", street: "", ward: "", province: "" } as AddressParts,
  cardMessage: "",
  senderNote: "",
  deliveryNote: "",
  mapUrl: "",
  /** Khách đồng ý lưu thông tin người đặt trên máy này (ALG 5.15) */
  rememberBuyer: false,
}

type Draft = typeof EMPTY

/**
 * Bản nháp form đặt hoa nhớ trên máy khách theo từng link: đóng tab rồi mở lại
 * vẫn còn thông tin đang điền. Xoá sau khi đặt thành công.
 */
export function useOrderDraft() {
  const [saved, setDraft, clearDraft] = useSavedState<Draft>("order-draft", EMPTY)
  // Nháp lưu từ bản cũ thiếu các ô mới → lấp bằng giá trị rỗng
  const draft = { ...EMPTY, ...saved }
  const field = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setDraft({ ...draft, [k]: v })
  // Thông tin người đặt đã lưu lần trước (khách đồng ý) → điền sẵn khi nháp còn trống
  useEffect(() => {
    const buyer = readSavedBuyer()
    if (!buyer) return
    setDraft((prev) => (prev.customerName || prev.customerPhone ? { ...EMPTY, ...prev, rememberBuyer: true } : { ...EMPTY, ...prev, ...buyer, rememberBuyer: true }))
  }, [setDraft])
  return {
    ...draft,
    setCustomerName: field("customerName"),
    setCustomerPhone: field("customerPhone"),
    setCustomerEmail: field("customerEmail"),
    setContactInfo: (info: { customerName: string; customerPhone?: string; customerEmail?: string }) =>
      setDraft((prev) => ({
        ...EMPTY,
        ...prev,
        customerName: info.customerName,
        customerPhone: info.customerPhone ?? prev.customerPhone,
        customerEmail: info.customerEmail ?? prev.customerEmail,
      })),
    setRecipientName: field("recipientName"),
    setRecipientPhone: field("recipientPhone"),
    setDeliveryDate: field("deliveryDate"),
    setDeliveryTimeSlot: field("deliveryTimeSlot"),
    setAddressParts: field("addressParts"),
    setNotes: (patch: Partial<Pick<Draft, "cardMessage" | "senderNote" | "deliveryNote" | "mapUrl">>) => setDraft({ ...draft, ...patch }),
    setRememberBuyer: field("rememberBuyer"),
    /** Đặt thành công: lưu/xoá thông tin người đặt theo lựa chọn của khách, rồi xoá nháp */
    clearDraft: () => {
      rememberBuyer(draft.rememberBuyer, draft)
      clearDraft()
    },
  }
}
