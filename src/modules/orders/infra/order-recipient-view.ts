import { deliveryAddressView, type OrderRecipientView } from "../domain/order-recipient"

/**
 * ADR-014 D-P2, bước P-3b: mọi lệnh đọc `orders` có trả `delivery_address` lấy kèm `order_recipients` và trả về JSON
 * đã ghép (`deliveryAddressView`) — nên phần người nhận/địa chỉ đến từ bảng mới, chỗ đọc và giao diện không đổi. Gắn ở
 * client Prisma (`src/core/tenancy/infra/prisma.ts`), áp cả trong giao dịch. Chọn đơn lồng trong bảng khác
 * (`order: { select: { delivery_address } }`) không qua đây: dùng `RECIPIENT_VIEW_SELECT` + `withDeliveryView`
 * (`tests/unit/architecture/order-recipient-reads.test.ts` khoá). Tệp này không import client Prisma (tránh vòng).
 */

/** Cột cần để dựng JSON đọc (`organization_id` để giải mã cột cá nhân, P-5c). */
export const RECIPIENT_VIEW_FIELDS = {
  organization_id: true, recipient_name: true, recipient_phone: true, address_line: true, address_parts: true,
} as const
export const RECIPIENT_VIEW_SELECT = { select: RECIPIENT_VIEW_FIELDS } as const

type Row = Record<string, unknown> & { delivery_address?: unknown; recipient?: OrderRecipientView | null }

/** Thay `delivery_address` của một dòng đơn bằng JSON đọc; bỏ `recipient` nếu người gọi không xin. */
export function withDeliveryView<T extends { delivery_address: unknown; recipient?: OrderRecipientView | null }>(row: T): Omit<T, "recipient"> {
  const { recipient, ...rest } = row
  return { ...rest, delivery_address: deliveryAddressView(row.delivery_address, recipient) as T["delivery_address"] }
}

const READS = new Set(["findFirst", "findFirstOrThrow", "findUnique", "findUniqueOrThrow", "findMany"])

type Args = { select?: Record<string, unknown> | null; include?: Record<string, unknown> | null } & Record<string, unknown>

/** Thêm `recipient` vào lệnh đọc khi kết quả có `delivery_address`; `null` = không cần. */
export function planRecipientRead(operation: string, args: Args | undefined): { args: Args; keepRecipient: boolean } | null {
  if (!READS.has(operation)) return null
  const a = args ?? {}
  if ((a.omit as Record<string, unknown> | undefined)?.delivery_address) return null
  // Người gọi đã xin `recipient`: giữ (thêm cột còn thiếu); chưa xin: chỉ lấy cột cần
  const merge = (current: unknown) => {
    if (current === undefined) return RECIPIENT_VIEW_SELECT
    if (current === true) return true
    const c = current as { select?: Record<string, unknown> }
    return c.select ? { ...c, select: { ...c.select, ...RECIPIENT_VIEW_FIELDS } } : c
  }
  if (a.select) {
    if (!a.select.delivery_address) return null
    const keepRecipient = Boolean(a.select.recipient)
    return { args: { ...a, select: { ...a.select, recipient: merge(a.select.recipient) } }, keepRecipient }
  }
  const keepRecipient = Boolean(a.include?.recipient)
  return { args: { ...a, include: { ...(a.include ?? {}), recipient: merge(a.include?.recipient) } }, keepRecipient }
}

/**
 * Áp `withDeliveryView` lên kết quả (một dòng, mảng, hoặc `null`). Chạy trong query extension — trước khi Prisma giải mã
 * cột cá nhân (P-5c: cột chỉ chứa bản mã) — nên `decodeRecipient` giải mã `recipient` trước khi ghép JSON.
 */
export function applyRecipientView(result: unknown, keepRecipient: boolean, decodeRecipient: <T>(r: T) => T = (r) => r): unknown {
  const one = (row: unknown) => {
    if (!row || typeof row !== "object" || !("delivery_address" in row)) return row
    const r = row as Row
    const view = deliveryAddressView(r.delivery_address, r.recipient ? decodeRecipient(r.recipient) : r.recipient)
    if (keepRecipient) return { ...r, delivery_address: view }
    const { recipient: _recipient, ...rest } = r
    return { ...rest, delivery_address: view }
  }
  return Array.isArray(result) ? result.map(one) : one(result)
}
