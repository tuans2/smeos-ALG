import { describe, expect, it } from "vitest"

import { clientItemMetadata, stockMarkMatchesItem } from "@/modules/orders/domain/order-item-metadata"
import { returnStock } from "@/modules/orders/infra/order-stock"

/**
 * Audit BL-19 (11/11/2026): `metadata` dòng hàng do client gửi được lưu nguyên, kể cả khoá `stock` (dấu "đã trừ
 * tồn"); huỷ đơn đọc dấu đó và cộng tồn — dấu giả `{ inventoryId, quantity: 500 }` cộng khống 500 vào tồn.
 */
describe("dấu trừ tồn trong metadata dòng hàng", () => {
  it("bỏ khoá `stock` khỏi metadata client, giữ các khoá khác", () => {
    expect(clientItemMetadata({ note: "Gói giấy kraft", stock: { inventoryId: "inv-1", quantity: 500 } })).toEqual({ note: "Gói giấy kraft" })
    expect(clientItemMetadata(undefined)).toBeUndefined()
    expect(clientItemMetadata(null)).toBeUndefined()
  })

  it("dấu chỉ hợp lệ khi dòng có sản phẩm và số lượng khớp", () => {
    expect(stockMarkMatchesItem({ inventoryId: "inv-1", quantity: 2 }, { productId: "p-1", quantity: 2 })).toBe(true)
    expect(stockMarkMatchesItem({ inventoryId: "inv-1", quantity: 500 }, { productId: null, quantity: 1 })).toBe(false)
    expect(stockMarkMatchesItem({ inventoryId: "inv-1", quantity: 500 }, { productId: "p-1", quantity: 1 })).toBe(false)
    expect(stockMarkMatchesItem({ inventoryId: "", quantity: 1 }, { productId: "p-1", quantity: 1 })).toBe(false)
    expect(stockMarkMatchesItem({ inventoryId: "inv-1", quantity: "1" }, { productId: "p-1", quantity: 1 })).toBe(false)
  })

  function fakeTx(items: Array<{ id: string; metadata: unknown; product_id: string | null; quantity: number }>) {
    const increments: unknown[] = []
    const tx = {
      order_items: { findMany: async () => items, updateMany: async () => ({ count: 1 }) },
      product_inventory: { updateMany: async (args: unknown) => { increments.push(args); return { count: 1 } } },
    }
    return { tx: tx as never, increments }
  }

  it("huỷ đơn có dấu giả (dòng không sản phẩm / lệch số lượng) → không cộng tồn", async () => {
    const { tx, increments } = fakeTx([
      { id: "i-1", metadata: { stock: { inventoryId: "inv-1", quantity: 500 } }, product_id: null, quantity: 1 },
      { id: "i-2", metadata: { stock: { inventoryId: "inv-1", quantity: 500 } }, product_id: "p-1", quantity: 1 },
    ])
    expect(await returnStock("org-1", "order-1", tx)).toBe(0)
    expect(increments).toEqual([])
  })

  it("dấu thật → cộng đúng số lượng vào dòng tồn của chính sản phẩm đó", async () => {
    const { tx, increments } = fakeTx([{ id: "i-1", metadata: { stock: { inventoryId: "inv-1", quantity: 2 } }, product_id: "p-1", quantity: 2 }])
    expect(await returnStock("org-1", "order-1", tx)).toBe(1)
    expect(increments).toEqual([
      {
        where: { id: "inv-1", organization_id: "org-1", product_id: "p-1", quantity_available: { not: null } },
        data: { quantity_available: { increment: 2 } },
      },
    ])
  })
})
