/**
 * Đơn của kênh bán → đầu vào tạo đơn nội bộ (luật thuần, GĐ4A).
 * Dòng có SKU khớp `products.code` nối về sản phẩm; dòng không khớp vẫn giữ (mô tả = tên trên sàn) để
 * không mất đơn — nhân viên nối tay sau. Không bịa địa chỉ: sàn không trả người nhận thì để trống.
 */

import type { ChannelOrder, ChannelOrderPayment } from "@/core/ports/sales-channel-order-provider"
import type { IngestOrderInput } from "@/modules/orders/domain/order-types"

export const MAX_ITEMS_PER_CHANNEL_ORDER = 100

export interface MappedChannelOrder {
  readonly input: IngestOrderInput
  readonly unmatchedSkus: string[]
}

export function mapChannelOrder(
  order: ChannelOrder,
  productIdBySku: ReadonlyMap<string, string>,
  channelLabel: string
): MappedChannelOrder | null {
  const items = order.items.slice(0, MAX_ITEMS_PER_CHANNEL_ORDER).filter((i) => i.quantity > 0 && i.unitPriceVnd >= 0)
  if (items.length === 0) return null
  const unmatchedSkus: string[] = []
  const mapped = items.map((item) => {
    const productId = item.sellerSku ? productIdBySku.get(item.sellerSku) : undefined
    if (!productId) unmatchedSkus.push(item.sellerSku ?? item.title)
    return {
      ...(productId ? { productId } : { description: item.title.slice(0, 200) }),
      quantity: Math.floor(item.quantity),
      unitPriceVnd: Math.round(item.unitPriceVnd),
    }
  })
  const note = [`Đơn từ ${channelLabel} — mã ${order.externalOrderId}`, order.buyerNote ? `Khách ghi chú: ${order.buyerNote}` : null]
    .filter(Boolean)
    .join("\n")
  return {
    input: {
      items: mapped,
      internalNote: note.slice(0, 1000),
      source: "CHANNEL",
      ...(order.recipient
        ? { deliveryAddress: { recipientName: order.recipient.name, phone: order.recipient.phone, street: order.recipient.address } }
        : {}),
    },
    unmatchedSkus,
  }
}

/**
 * Số tiền ghi vào sổ thu khi nhập đơn sàn (PO 12/11/2026, audit BL-34): đơn sàn đã thu → ghi đúng số khách trả, không
 * vượt tổng đơn nội bộ; đơn thu hộ (COD) hoặc đầu nối không báo → 0 (thu khi giao như đơn thường). Thuần.
 */
export function channelPrepaidVnd(payment: ChannelOrderPayment | null | undefined, orderTotalVnd: number): number {
  if (payment?.kind !== "PREPAID" || !Number.isFinite(payment.paidVnd)) return 0
  return Math.max(0, Math.min(Math.round(payment.paidVnd), orderTotalVnd))
}

/** Chia lô theo giới hạn của kênh. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/**
 * Còn hàng trên kênh bán: sản phẩm đang mở bán, và nếu theo dõi tồn theo số lượng (`trackedQuantity` có giá trị) thì còn
 * ít nhất 1 — trước đây chỉ xét trạng thái mở bán nên hết số lượng vẫn báo "còn" lên sàn (audit BL-34). Thuần.
 */
export function channelInStock(productStatus: string, trackedQuantity: number | undefined): boolean {
  return productStatus === "ACTIVE" && (trackedQuantity === undefined || trackedQuantity > 0)
}
