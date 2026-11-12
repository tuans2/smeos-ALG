/**
 * Use-case: Get Order Printout (Chuẩn bị phiếu in đơn & sản xuất — M10, R7).
 */

import { AppError } from "@/core/http/errors"
import { inBranchScope } from "@/core/tenancy"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { IOrderRepository } from "../domain/repositories/order-repository.interface"
import { getOrderRepository } from "../infra/order-repository"
import { formatDate } from "@/lib/i18n/formatters"
import { floristNoteFrom, toFloristItem, withProductFallback, type FloristItem, type FloristProductFallback } from "../domain/florist-work"
import { loadPrintProducts } from "../infra/order-print-products"

export interface OrderPrintData {
  orderCode: string
  createdDate: string
  deliveryWindow: string
  recipientInfo: {
    name: string
    phone: string
    address: string
  }
  /** Lời chúc của đơn; rỗng khi đơn không có. */
  cardMessage: string
  items: Array<{
    name: string
    quantity: number
    price: number
    subtotal: number
  }>
  totalVnd: number
  floristNote: string
  /** Phiếu xưởng khổ A6 (checklist ALG 4.9): công thức theo phiên bản, ảnh mẫu — không có giá. */
  florist: FloristItem[]
}

export async function getOrderPrintout(
  ctx: TenantContext,
  orderId: string,
  repo: IOrderRepository = getOrderRepository(),
  products: (organizationId: string, productIds: string[]) => Promise<Map<string, FloristProductFallback>> = loadPrintProducts
): Promise<OrderPrintData> {
  const order = await repo.findById(ctx.organizationId, orderId)
  // Ngoài chi nhánh được giao → như không tồn tại (checklist ALG 9.13)
  if (!order || !inBranchScope(ctx, order.branchId)) {
    throw new AppError("NOT_FOUND", `Không tìm thấy đơn hàng với mã ID: ${orderId}`)
  }

  const items = order.items ?? []
  const productInfo = await products(ctx.organizationId, items.flatMap((it) => (it.productId ? [it.productId] : [])))
  const recipient = order.deliveryAddress
  const fullAddress = [
    recipient?.street,
    recipient?.ward,
    recipient?.district,
    recipient?.province,
  ]
    .filter(Boolean)
    .join(", ")

  return {
    orderCode: order.code,
    createdDate: formatDate(order.createdAt),
    deliveryWindow: order.deliveryWindow
      ? `${order.deliveryWindow.timeSlot ? order.deliveryWindow.timeSlot + " " : ""}${order.deliveryWindow.date}`
      : "Giao tiêu chuẩn",
    recipientInfo: {
      name: recipient?.recipientName ?? "Khách lẻ",
      phone: recipient?.phone ?? "Chưa có",
      // Không bịa "Nhận tại cửa hàng" khi đơn thiếu địa chỉ — người giao hiểu nhầm là khách tự lấy (audit BL-37)
      address: fullAddress || "Chưa có địa chỉ giao",
    },
    // Rỗng khi đơn không có lời chúc — trước đây trả câu mặc định và băng rôn in to "KHÔNG CÓ LỜI NHẮN THIỆP" (BL-37)
    cardMessage: order.cardMessage?.trim() ?? "",
    items: (order.items ?? []).map((it) => ({
      name: it.description ?? "Sản phẩm",
      quantity: it.quantity,
      price: it.unitPriceVnd,
      subtotal: it.quantity * it.unitPriceVnd,
    })),
    totalVnd: order.totalVnd,
    floristNote: floristNoteFrom(order.internalNote),
    florist: items.map((it) =>
      withProductFallback(
        toFloristItem({ description: it.description ?? null, quantity: it.quantity, metadata: it.metadata }),
        it.productId ? productInfo.get(it.productId) : undefined
      )
    ),
  }
}
