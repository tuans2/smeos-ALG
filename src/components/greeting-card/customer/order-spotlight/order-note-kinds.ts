/**
 * Cấu hình khối Ghi chú dạng gọn của form đặt mua: loại ghi chú nào có cho từng ngành, loại nào mở sẵn.
 * Thuần dữ liệu — không phụ thuộc React để test được.
 */
export type OrderNoteKind = "cardMessage" | "senderNote" | "deliveryNote" | "mapUrl" | "specialRequests"

const STANDARD_KINDS: readonly OrderNoteKind[] = ["cardMessage", "senderNote", "deliveryNote", "mapUrl"]
const HOMESTAY_KINDS: readonly OrderNoteKind[] = ["specialRequests"]

/** Ô mở sẵn theo ngành: ngành quà tặng mở lời nhắn; dịch vụ mở ghi chú yêu cầu; homestay mở yêu cầu đặc biệt. */
const DEFAULT_OPEN: Record<string, readonly OrderNoteKind[]> = {
  FLORAL: ["cardMessage"],
  CRAFT_GIFT: ["cardMessage"],
  RETAIL_GENERAL: ["cardMessage"],
  FASHION: ["cardMessage"],
  FNB: ["cardMessage"],
  SERVICES: ["senderNote"],
  HOMESTAY: ["specialRequests"],
}

export function availableNoteKinds(industryKey?: string | null): readonly OrderNoteKind[] {
  return industryKey === "HOMESTAY" ? HOMESTAY_KINDS : STANDARD_KINDS
}

export function defaultOpenNoteKinds(industryKey?: string | null): readonly OrderNoteKind[] {
  return DEFAULT_OPEN[industryKey ?? ""] ?? ["cardMessage"]
}

/** Ô mở ban đầu = mặc định của ngành ∪ ô đã có nội dung (khách quay lại sửa đơn), theo thứ tự chuẩn. */
export function initialOpenNoteKinds(
  industryKey: string | null | undefined,
  values: Partial<Record<OrderNoteKind, string>>
): OrderNoteKind[] {
  const defaults = defaultOpenNoteKinds(industryKey)
  return availableNoteKinds(industryKey).filter((k) => defaults.includes(k) || (values[k] ?? "").trim() !== "")
}
