import { readFileSync } from "node:fs"
import { join } from "node:path"

import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit BL-36: migration chữa đơn giá 0 ₫ của đơn Điều phối cũ. Chỉ đơn `FLR-…` một dòng hàng 0 ₫; đơn nhiều dòng,
 * đơn nguồn khác, dòng đã có giá giữ nguyên; chạy lại không đổi gì thêm.
 */
const SQL = readFileSync(join(process.cwd(), "prisma/migrations/20261112150000_coordinator_item_unit_price_backfill/migration.sql"), "utf8")
const DO_BLOCK = SQL.slice(SQL.indexOf("DO $$"))

describe("chữa đơn giá dòng hàng đơn Điều phối cũ", () => {
  let a: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("bl36")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function order(code: string, total: number, vat: number, lines: Array<{ qty: number; price: number }>) {
    const o = await prisma.orders.create({
      data: { organization_id: a.organizationId, code, status: "CONFIRMED", total_vnd: total, vat_amount_vnd: vat, paid_vnd: 0, balance_vnd: total, created_by: a.userId },
    })
    for (const l of lines) await prisma.order_items.create({ data: { organization_id: a.organizationId, order_id: o.id, description: "Bình hoa", quantity: l.qty, unit_price_vnd: l.price } })
    return o.id
  }
  const prices = async (orderId: string) => (await prisma.order_items.findMany({ where: { order_id: orderId } })).map((i) => Number(i.unit_price_vnd)).sort()

  it("một dòng 0 ₫ → đơn giá = (tổng − VAT) / số lượng; các đơn khác giữ nguyên; chạy lại an toàn", async () => {
    const single = await order("FLR-261101-0001", 1_080_000, 80_000, [{ qty: 2, price: 0 }])
    const multi = await order("FLR-261101-0002", 900_000, 0, [{ qty: 1, price: 0 }, { qty: 1, price: 0 }])
    const priced = await order("FLR-261101-0003", 500_000, 0, [{ qty: 1, price: 450_000 }])
    const other = await order("DH261101-0001", 300_000, 0, [{ qty: 1, price: 0 }])
    await prisma.$executeRawUnsafe(DO_BLOCK)
    await prisma.$executeRawUnsafe(DO_BLOCK)
    expect(await prices(single)).toEqual([500_000])
    expect(await prices(multi)).toEqual([0, 0])
    expect(await prices(priced)).toEqual([450_000])
    expect(await prices(other)).toEqual([0])
  })
})
