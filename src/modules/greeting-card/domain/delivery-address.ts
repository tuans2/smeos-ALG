/**
 * Địa chỉ giao hoa 5 ô (PO chốt 06/10/2026). Từ 01/07/2025 Việt Nam bỏ cấp
 * quận/huyện nên ô Quận/Huyện là tuỳ chọn (khách quen ghi theo địa chỉ cũ).
 * Pure TypeScript — dùng chung form khách và máy chủ.
 */

export interface AddressParts {
  /** Số nhà / toà / căn hộ */
  houseNumber: string
  /** Đường / thôn / ấp / tổ */
  street: string
  /** Phường / xã / đặc khu */
  ward: string
  /** Quận / huyện (cũ) — tuỳ chọn */
  district?: string | undefined
  /** Tỉnh / thành phố */
  province: string
}

export const ADDRESS_PART_MAX = 120

export const ADDRESS_FIELDS: readonly { key: keyof AddressParts; label: string; placeholder: string; required: boolean }[] = [
  { key: "houseNumber", label: "Số nhà", placeholder: "VD: 45, Căn 12A.05", required: true },
  { key: "street", label: "Đường / Thôn / Ấp", placeholder: "VD: Lê Lợi", required: true },
  { key: "ward", label: "Phường / Xã", placeholder: "VD: Phường Bến Thành", required: true },
  { key: "district", label: "Quận / Huyện (nếu có)", placeholder: "VD: Quận 1 (không bắt buộc)", required: false },
  { key: "province", label: "Tỉnh / Thành phố", placeholder: "VD: TP. Hồ Chí Minh", required: true },
]

/** Lỗi theo từng ô (tiếng Việt); rỗng nếu hợp lệ. */
export function validateAddressParts(parts: Partial<AddressParts>): Record<string, string> {
  const errors: Record<string, string> = {}
  for (const f of ADDRESS_FIELDS) {
    const value = (parts[f.key] ?? "").trim()
    if (f.required && !value) errors[f.key] = `Vui lòng nhập ${f.label.toLowerCase()}`
    else if (value.length > ADDRESS_PART_MAX) errors[f.key] = `${f.label} tối đa ${ADDRESS_PART_MAX} ký tự`
  }
  return errors
}

/** Một dòng địa chỉ đầy đủ cho shipper/in phiếu: "45 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh". */
export function composeAddress(parts: Partial<AddressParts>): string {
  const head = [parts.houseNumber, parts.street].map((s) => (s ?? "").trim()).filter(Boolean).join(" ")
  return [head, parts.ward, parts.district, parts.province]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ")
}

/**
 * Form mới gửi `addressParts`: máy chủ tự ghép dòng địa chỉ (không tin dòng client gửi)
 * và trả lỗi theo từng ô. Form cũ chỉ có `deliveryAddress` → giữ nguyên.
 */
export function normalizeOrderAddress<T extends { deliveryAddress: string; addressParts?: AddressParts | undefined }>(
  input: T,
): { input: T; errors: Record<string, string> } {
  if (!input.addressParts) return { input, errors: {} }
  const errors = validateAddressParts(input.addressParts)
  const parts: AddressParts = {
    houseNumber: input.addressParts.houseNumber.trim(),
    street: input.addressParts.street.trim(),
    ward: input.addressParts.ward.trim(),
    province: input.addressParts.province.trim(),
    ...(input.addressParts.district?.trim() ? { district: input.addressParts.district.trim() } : {}),
  }
  return { input: { ...input, addressParts: parts, deliveryAddress: composeAddress(parts) }, errors }
}

/**
 * Trích xuất chuỗi địa chỉ giao hàng hoàn chỉnh từ trường `delivery_address` trong CSDL.
 * Hỗ trợ mọi cấu trúc: string, { street }, { full_address }, { fullAddress }, { address }, hoặc { parts }.
 */
export function formatDeliveryAddress(raw: unknown): string {
  if (!raw) return "Theo thỏa thuận"
  if (typeof raw === "string") return raw.trim() || "Theo thỏa thuận"

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    if (typeof obj.street === "string" && obj.street.trim()) return obj.street.trim()
    if (typeof obj.full_address === "string" && obj.full_address.trim()) return obj.full_address.trim()
    if (typeof obj.fullAddress === "string" && obj.fullAddress.trim()) return obj.fullAddress.trim()
    if (typeof obj.address === "string" && obj.address.trim()) return obj.address.trim()

    if (obj.parts && typeof obj.parts === "object") {
      const composed = composeAddress(obj.parts as Partial<AddressParts>)
      if (composed) return composed
    }
  }

  return "Theo thỏa thuận"
}

/**
 * Phường / quận / tỉnh của địa chỉ giao (form 5 ô lưu `{ parts }` hoặc các trường phẳng). Địa chỉ cũ chỉ
 * có một dòng chữ → null: không đoán từ chuỗi, để sàng lọc khu vực không khớp nhầm.
 */
export function deliveryAreaOf(raw: unknown): { ward?: string; district?: string; province?: string } | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const src = (obj.parts && typeof obj.parts === "object" ? obj.parts : obj) as Record<string, unknown>
  const pick = (k: string) => (typeof src[k] === "string" && (src[k] as string).trim() ? (src[k] as string).trim() : undefined)
  const area = { ward: pick("ward"), district: pick("district"), province: pick("province") }
  if (!area.ward && !area.province) return null
  return Object.fromEntries(Object.entries(area).filter(([, v]) => v)) as { ward?: string; district?: string; province?: string }
}

/** Có địa chỉ thật để tra toạ độ (không phải giá trị mặc định "Theo thỏa thuận") */
export function hasDeliveryAddress(formatted: string): boolean {
  return Boolean(formatted.trim()) && formatted !== "Theo thỏa thuận"
}

/**
 * Che 4 chữ số cuối của số điện thoại (ví dụ: "0912121212" -> "091212****").
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return ""
  const clean = phone.trim()
  if (clean.length <= 4) return "****"
  return clean.slice(0, -4) + "****"
}

export interface RecipientInfo {
  recipientName: string | null
  phone: string | null
  maskedPhone: string | null
}

/**
 * Trích xuất Họ tên và Số điện thoại người nhận từ trường `delivery_address`.
 */
export function extractRecipientInfo(raw: unknown): RecipientInfo {
  if (!raw || typeof raw !== "object") {
    return { recipientName: null, phone: null, maskedPhone: null }
  }

  const obj = raw as Record<string, unknown>
  const recipientName = typeof obj.recipientName === "string" && obj.recipientName.trim()
    ? obj.recipientName.trim()
    : (typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : null)

  const phone = typeof obj.phone === "string" && obj.phone.trim()
    ? obj.phone.trim()
    : (typeof obj.recipientPhone === "string" && obj.recipientPhone.trim() ? obj.recipientPhone.trim() : null)

  return {
    recipientName,
    phone,
    maskedPhone: phone ? maskPhoneNumber(phone) : null,
  }
}
