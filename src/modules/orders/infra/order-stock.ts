import { conflict } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { stockMarkMatchesItem } from "../domain/order-item-metadata"

/** Dấu "đơn đã trừ tồn" lưu trong `order_items.metadata.stock` — để hoàn đúng dòng tồn, đúng một lần. */
export interface StockMark {
  inventoryId: string
  quantity: number
  returned?: true
}

type Tx = Prisma.TransactionClient

/**
 * Tồn kho theo số lượng (PO 07/11/2026, kế hoạch logic nghiệp vụ Q9; audit BL-16): chỉ sản phẩm BẬT theo dõi số
 * lượng — có dòng `product_inventory` với `quantity_available` khác rỗng. Tạo đơn thì trừ (đây cũng là giữ chỗ),
 * huỷ thì hoàn. Dòng tồn chọn theo chi nhánh của đơn; đơn không gắn chi nhánh chỉ trừ khi sản phẩm có đúng một dòng
 * tồn được theo dõi (nhiều chi nhánh mà không biết chi nhánh nào thì không đoán).
 * Trừ bằng câu cập nhật có điều kiện `quantity_available >= số lượng` — hai đơn đồng thời không cùng lấy món cuối.
 */
export async function takeStock(
  tx: Tx,
  organizationId: string,
  branchId: string | null,
  items: ReadonlyArray<{ productId?: string | null | undefined; quantity: number; description?: string | null | undefined }>
): Promise<Array<StockMark | null>> {
  const marks: Array<StockMark | null> = []
  for (const it of items) {
    if (!it.productId || it.quantity <= 0) {
      marks.push(null)
      continue
    }
    const rows = await tx.product_inventory.findMany({
      where: { organization_id: organizationId, product_id: it.productId, quantity_available: { not: null }, ...(branchId ? { branch_id: branchId } : {}) },
      select: { id: true, quantity_available: true },
    })
    const row = rows.length === 1 ? rows[0]! : null
    if (!row) {
      marks.push(null)
      continue
    }
    const moved = await tx.product_inventory.updateMany({
      where: { id: row.id, organization_id: organizationId, quantity_available: { gte: it.quantity } },
      data: { quantity_available: { decrement: it.quantity } },
    })
    if (moved.count === 0) {
      throw conflict(`"${it.description ?? "Sản phẩm"}" chỉ còn ${row.quantity_available ?? 0} — không đủ ${it.quantity}.`)
    }
    marks.push({ inventoryId: row.id, quantity: it.quantity })
  }
  return marks
}

type MarkedItem = { id: string; meta: Record<string, unknown>; mark: StockMark; raw: Prisma.JsonValue; productId: string }

async function markedItems(tx: Tx, organizationId: string, orderId: string): Promise<MarkedItem[]> {
  const items = await tx.order_items.findMany({
    where: { organization_id: organizationId, order_id: orderId },
    select: { id: true, metadata: true, product_id: true, quantity: true },
  })
  const out: MarkedItem[] = []
  for (const item of items) {
    const meta = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : null
    const mark = meta?.stock as StockMark | undefined
    // Dấu phải khớp chính dòng (sản phẩm, số lượng) và dòng tồn phải của đúng sản phẩm đó (audit BL-19)
    if (meta && mark && stockMarkMatchesItem(mark, { productId: item.product_id, quantity: item.quantity })) {
      out.push({ id: item.id, meta, mark, raw: item.metadata, productId: item.product_id! })
    }
  }
  return out
}

/**
 * Trừ lại tồn đã hoàn khi đơn được khôi phục (đơn Thẻ chào bỏ hiển thị rồi khôi phục — PO 07/11/2026). Không đủ
 * tồn → 409, không khôi phục. Chạy trong giao dịch của lần khôi phục.
 */
export async function retakeStock(tx: Tx, organizationId: string, orderId: string): Promise<number> {
  let taken = 0
  for (const { id, meta, mark, raw, productId } of await markedItems(tx, organizationId, orderId)) {
    if (!mark.returned) continue
    const moved = await tx.product_inventory.updateMany({
      where: { id: mark.inventoryId, organization_id: organizationId, product_id: productId, quantity_available: { gte: mark.quantity } },
      data: { quantity_available: { decrement: mark.quantity } },
    })
    if (moved.count === 0) throw conflict("Sản phẩm của đơn không còn đủ tồn để khôi phục — nhập thêm tồn rồi thử lại.")
    const { returned: _returned, ...rest } = mark
    const claimed = await tx.order_items.updateMany({
      where: { id, organization_id: organizationId, metadata: { equals: raw as Prisma.InputJsonValue } },
      data: { metadata: { ...meta, stock: rest } as Prisma.InputJsonValue },
    })
    if (claimed.count === 0) throw conflict("Đơn vừa thay đổi, vui lòng tải lại")
    taken += 1
  }
  return taken
}

/**
 * Hoàn tồn đã trừ khi đơn bị huỷ; dòng đã hoàn được đánh dấu nên gọi lại không hoàn hai lần. Có `tx` thì chạy trong
 * giao dịch của lần huỷ (huỷ lỗi thì không hoàn), không có thì tự mở giao dịch.
 */
export async function returnStock(organizationId: string, orderId: string, db?: Tx): Promise<number> {
  if (db) return returnStockIn(db, organizationId, orderId)
  return prisma.$transaction((tx) => returnStockIn(tx, organizationId, orderId))
}

async function returnStockIn(tx: Tx, organizationId: string, orderId: string): Promise<number> {
  let returned = 0
  for (const { id, meta, mark, raw, productId } of await markedItems(tx, organizationId, orderId)) {
    if (mark.returned) continue
    // Đánh dấu trước (có điều kiện theo phiên bản đọc được) rồi mới cộng tồn — hai lượt huỷ đồng thời chỉ một lượt cộng
    const claimed = await tx.order_items.updateMany({
      where: { id, organization_id: organizationId, metadata: { equals: raw as Prisma.InputJsonValue } },
      data: { metadata: { ...meta, stock: { ...mark, returned: true } } as Prisma.InputJsonValue },
    })
    if (claimed.count === 0) continue
    await tx.product_inventory.updateMany({
      where: { id: mark.inventoryId, organization_id: organizationId, product_id: productId, quantity_available: { not: null } },
      data: { quantity_available: { increment: mark.quantity } },
    })
    returned += 1
  }
  return returned
}
