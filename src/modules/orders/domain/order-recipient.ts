/**
 * ADR-014 D-P2, bước P-3: dữ liệu cá nhân trong JSON `orders.delivery_address` ↔ bảng `order_recipients`. Đơn có nhiều
 * dạng (Thẻ chào: `{ recipientName, phone, street, parts, zone, notes, mapUrl }`; nhập tay: `{ recipientName, phone,
 * street, ward, district, province }`; điều phối: `{ street, ward, district, city, country, formattedAddress }`; dữ liệu
 * cũ: chuỗi, `{ name }`, `{ full_address }`…). Khoá vận hành (`zone`, `notes`, `mapUrl`…) ở lại JSON.
 * - `recipientFromDeliveryAddress`: cột của `order_recipients` (ghi kép, P-3a). `address_parts` giữ NGUYÊN các khoá địa
 *   chỉ như đã lưu, để `deliveryAddressView` dựng lại đúng JSON cũ.
 * - `deliveryAddressView` (P-3b): JSON mà mọi chỗ đọc dùng — khoá vận hành của đơn + phần cá nhân lấy từ bảng.
 * Khối backfill trong migration làm đúng như `recipientFromDeliveryAddress` (`tests/tenant/order-recipients.test.ts`).
 * Pure TypeScript.
 */

export interface OrderRecipientAddress {
  recipient_name: string | null
  recipient_phone: string | null
  address_line: string | null
  address_parts: Record<string, unknown> | null
}

export interface OrderRecipientVat {
  vat_company_name: string | null
  vat_tax_code: string | null
  vat_company_address: string | null
  vat_email: string | null
}

/** Khoá địa chỉ (giữ nguyên trong `address_parts`); trùng danh sách trong migration `*_order_recipients_address`. */
export const ADDRESS_KEYS = [
  "houseNumber", "street", "ward", "district", "province", "city", "country", "formattedAddress", "full_address", "fullAddress", "address", "parts",
] as const
const NAME_KEYS = ["recipientName", "name"] as const
const PHONE_KEYS = ["phone", "recipientPhone"] as const
const PII_KEYS: ReadonlySet<string> = new Set([...ADDRESS_KEYS, ...NAME_KEYS, ...PHONE_KEYS])

const WS = /^[ \t\r\n]+|[ \t\r\n]+$/g

function str(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  if (typeof v !== "string") return null
  const t = v.replace(WS, "")
  return t || null
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
}

/** "45 Lê Lợi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh" — như `composeAddress`, chỉ lấy ô là chuỗi. */
function composeParts(parts: Record<string, unknown>): string | null {
  const head = [str(parts, "houseNumber"), str(parts, "street")].filter(Boolean).join(" ")
  return [head, str(parts, "ward"), str(parts, "district"), str(parts, "province")].filter(Boolean).join(", ") || null
}

export function recipientFromDeliveryAddress(raw: unknown): OrderRecipientAddress {
  if (typeof raw === "string") {
    const line = raw.replace(WS, "")
    return { recipient_name: null, recipient_phone: null, address_line: line || null, address_parts: null }
  }
  if (!isObject(raw)) return { recipient_name: null, recipient_phone: null, address_line: null, address_parts: null }

  const parts = isObject(raw.parts) ? raw.parts : null
  const address = Object.fromEntries(ADDRESS_KEYS.filter((k) => k in raw && raw[k] !== null).map((k) => [k, raw[k]]))
  return {
    recipient_name: str(raw, "recipientName") ?? str(raw, "name"),
    recipient_phone: str(raw, "phone") ?? str(raw, "recipientPhone"),
    address_line: str(raw, "street") ?? str(raw, "full_address") ?? str(raw, "fullAddress") ?? str(raw, "address")
      ?? str(raw, "formattedAddress") ?? (parts ? composeParts(parts) : null),
    address_parts: Object.keys(address).length > 0 ? address : null,
  }
}

/** Phần còn lại của JSON khi bỏ dữ liệu cá nhân (chuỗi → `null`); dùng ở P-3c và để kiểm `deliveryAddressView`. */
export function stripRecipientPii(raw: unknown): Record<string, unknown> | null {
  if (!isObject(raw)) return null
  const rest = Object.fromEntries(Object.entries(raw).filter(([k]) => !PII_KEYS.has(k)))
  return Object.keys(rest).length > 0 ? rest : null
}

export type OrderRecipientView = Pick<OrderRecipientAddress, "recipient_name" | "recipient_phone" | "address_line"> & { address_parts: unknown }

/**
 * JSON địa chỉ giao để đọc (P-3b): khoá vận hành của `delivery_address` + phần cá nhân từ `order_recipients`. Đơn chưa
 * có dòng người nhận → JSON như cũ. Tên/SĐT luôn ở khoá `recipientName`/`phone`; JSON cũ dạng chuỗi → `{ street }`.
 */
export function deliveryAddressView(raw: unknown, recipient: OrderRecipientView | null | undefined): unknown {
  if (!recipient) return raw
  const parts = isObject(recipient.address_parts) ? recipient.address_parts : null
  const out: Record<string, unknown> = {
    ...(stripRecipientPii(raw) ?? {}),
    ...(parts ?? (recipient.address_line ? { street: recipient.address_line } : {})),
    ...(recipient.recipient_name ? { recipientName: recipient.recipient_name } : {}),
    ...(recipient.recipient_phone ? { phone: recipient.recipient_phone } : {}),
  }
  return Object.keys(out).length > 0 ? out : raw === undefined ? undefined : null
}
