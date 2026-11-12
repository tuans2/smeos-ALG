/**
 * Khoá trong `order_items.metadata` chỉ máy chủ được ghi (audit BL-19, 11/11/2026). `stock` là dấu "dòng này đã trừ
 * tồn" mà lệnh huỷ đọc để cộng tồn lại — client gửi được khoá này thì huỷ đơn sẽ cộng tồn khống. Thuần.
 */
export const SERVER_ONLY_ITEM_METADATA_KEYS = ["stock"] as const

/** Metadata dòng hàng từ đầu vào (API, chat, kênh bán) sau khi bỏ khoá chỉ máy chủ được ghi. */
export function clientItemMetadata(meta: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (!(SERVER_ONLY_ITEM_METADATA_KEYS as readonly string[]).includes(key)) out[key] = value
  }
  return out
}

/**
 * Dấu trừ tồn chỉ có hiệu lực khi khớp chính dòng hàng: dòng có sản phẩm và số lượng trừ đúng bằng số lượng dòng.
 * Chặn cả dấu giả đã lỡ lưu trước bản sửa BL-19.
 */
export function stockMarkMatchesItem(
  mark: { inventoryId?: unknown; quantity?: unknown } | null | undefined,
  item: { productId: string | null; quantity: number },
): boolean {
  return (
    typeof mark?.inventoryId === "string" &&
    mark.inventoryId.length > 0 &&
    typeof mark.quantity === "number" &&
    mark.quantity > 0 &&
    item.productId !== null &&
    mark.quantity === item.quantity
  )
}
