import { conflict } from "@/core/http/errors"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"

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

/** Hoàn tồn đã trừ khi đơn bị huỷ; dòng đã hoàn được đánh dấu nên gọi lại không hoàn hai lần. */
export async function returnStock(organizationId: string, orderId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const items = await tx.order_items.findMany({ where: { organization_id: organizationId, order_id: orderId }, select: { id: true, metadata: true } })
    let returned = 0
    for (const item of items) {
      const meta = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : null
      const mark = meta?.stock as StockMark | undefined
      if (!mark || mark.returned || !mark.inventoryId || !(mark.quantity > 0)) continue
      // Đánh dấu trước (có điều kiện theo phiên bản đọc được) rồi mới cộng tồn — hai lượt huỷ đồng thời chỉ một lượt cộng
      const claimed = await tx.order_items.updateMany({
        where: { id: item.id, organization_id: organizationId, metadata: { equals: item.metadata as Prisma.InputJsonValue } },
        data: { metadata: { ...meta, stock: { ...mark, returned: true } } as Prisma.InputJsonValue },
      })
      if (claimed.count === 0) continue
      await tx.product_inventory.updateMany({
        where: { id: mark.inventoryId, organization_id: organizationId, quantity_available: { not: null } },
        data: { quantity_available: { increment: mark.quantity } },
      })
      returned += 1
    }
    return returned
  })
}
