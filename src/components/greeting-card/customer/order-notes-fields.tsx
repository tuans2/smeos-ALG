"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import React from "react"
import { ORDER_FIELD_MAX } from "@/modules/greeting-card/domain/greeting-card-rules"
import { DELIVERY_NOTE_MAX, MAP_URL_MAX } from "@/modules/greeting-card/domain/delivery-note"
import { getIndustryTerminology } from "@/modules/organization/domain/industry-profile"
import type { OrderNoteKind } from "./order-spotlight/order-note-kinds"

export interface OrderNotesValue {
  cardMessage: string
  senderNote: string
  deliveryNote: string
  mapUrl: string
}

const LABEL = "block text-body-sm font-bold text-text mb-1"

function getCardPlaceholder(industryKey?: string | null): string {
  switch (industryKey) {
    case "FASHION":
      return "VD: Lời nhắn gửi kèm trang phục, yêu cầu ghi chú thẻ cảm ơn..."
    case "HOMESTAY":
      return "VD: Giờ check-in dự kiến, yêu cầu chuẩn bị phòng đón tiếp..."
    case "FNB":
      return "VD: Lời chúc mừng sinh nhật tiệc, khẩu vị ít đường / không đá..."
    case "CRAFT_GIFT":
      return "VD: Lời chúc gửi kèm tác phẩm thủ công, thông điệp người tặng..."
    case "SERVICES":
      return "VD: Yêu cầu đặc biệt về chuyên viên hoặc thời gian liệu trình..."
    case "RETAIL_GENERAL":
      return "VD: Lời nhắn gửi người nhận, ghi chú đóng gói quà tặng..."
    case "FLORAL":
    default:
      return "VD: Chúc mừng ngày 20/10 người phụ nữ tuyệt vời của anh..."
  }
}

/** Nhãn hiển thị của từng loại ghi chú — dùng chung cho ô nhập và menu "Thêm ghi chú". */
export function orderNoteLabel(kind: OrderNoteKind, industryKey?: string | null): string {
  const terms = getIndustryTerminology(industryKey)
  switch (kind) {
    case "cardMessage":
      return terms.printablesTitle ? `${terms.printablesTitle} / Lời nhắn` : "Nội dung thiệp mừng / băng rôn"
    case "senderNote":
      return terms.makerTitle
        ? `Ghi chú cho bộ phận gia công / ${terms.makerTitle.toLowerCase()}`
        : "Ghi chú cho xưởng / bộ phận gia công"
    case "deliveryNote":
      return "Ghi chú cho người giao hàng"
    case "mapUrl":
      return "Link vị trí trên Google Maps (nếu có)"
    case "specialRequests":
      return "Yêu cầu đặc biệt cho Quản gia / Chủ nhà"
  }
}

/**
 * Một ô ghi chú theo loại. Các loại tách riêng để không lẫn: lời nhắn in lên thiệp/thẻ bài (người nhận đọc),
 * ghi chú cho cửa hàng / thợ gia công, ghi chú cho người giao hàng (+ link Google Maps nếu khách có),
 * yêu cầu đặc biệt (homestay).
 */
export function OrderNoteField({
  kind,
  idPrefix,
  value,
  inputClassName,
  industryKey,
  onChange,
}: {
  kind: OrderNoteKind
  idPrefix: string
  value: string
  inputClassName: string
  industryKey?: string | null | undefined
  onChange: (value: string) => void
}) {
  const id = `${idPrefix}-${kind}`
  const label = (
    <label htmlFor={id} className={LABEL}>
      {orderNoteLabel(kind, industryKey)}
    </label>
  )

  if (kind === "cardMessage" || kind === "specialRequests") {
    const max = kind === "cardMessage" ? ORDER_FIELD_MAX.cardMessage : 500
    const placeholder =
      kind === "cardMessage"
        ? getCardPlaceholder(industryKey)
        : "VD: Gia đình có trẻ nhỏ cần kê thêm đệm phụ; cần mượn bếp nướng than BBQ ngoài trời; check-in muộn sau 20:00..."
    return (
      <div>
        {label}
        <Textarea
          rows={kind === "cardMessage" ? 2 : 3}
          placeholder={placeholder}
          value={value}
          maxLength={max}
          id={id}
          aria-describedby={`${id}-count`}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClassName} h-auto p-3 resize-none`}
        />
        <p
          id={`${id}-count`}
          aria-live="polite"
          className={`mt-1 text-right text-caption ${value.length >= max ? "text-warning-text font-bold" : "text-text-muted"}`}
        >
          {value.length}/{max} ký tự
        </p>
      </div>
    )
  }

  const config = {
    senderNote: { type: "text", max: ORDER_FIELD_MAX.senderNote, placeholder: "VD: Lưu ý quy cách, đóng gói hoặc chi tiết phụ kiện" },
    deliveryNote: { type: "text", max: DELIVERY_NOTE_MAX, placeholder: "VD: Gọi trước 15 phút, người nhận vắng thì gửi bảo vệ" },
    mapUrl: { type: "url", max: MAP_URL_MAX, placeholder: "Mở Google Maps → Chia sẻ → Sao chép đường liên kết" },
  }[kind]

  return (
    <div>
      {label}
      <Input
        type={config.type}
        {...(kind === "mapUrl" ? { inputMode: "url" as const } : {})}
        placeholder={config.placeholder}
        value={value}
        maxLength={config.max}
        id={id}
        onChange={(e) => onChange(e.target.value)}
        className={inputClassName}
      />
      {kind === "mapUrl" && (
        <p className="mt-1 text-caption text-text-muted">Giúp người giao tìm đúng chỗ nhanh hơn, nhất là địa chỉ trong hẻm hoặc khu mới.</p>
      )}
    </div>
  )
}
