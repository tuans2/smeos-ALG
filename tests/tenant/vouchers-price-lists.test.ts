import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getBatch, PATCH as patchBatch } from "@/app/api/v1/vouchers/batches/[id]/route"
import { GET as exportBatch } from "@/app/api/v1/vouchers/batches/[id]/export/route"
import { GET as listBatches, POST as createBatch } from "@/app/api/v1/vouchers/batches/route"
import { GET as getPriceList, PATCH as patchPriceList } from "@/app/api/v1/price-lists/[id]/route"
import { GET as listPriceLists, POST as createPriceList } from "@/app/api/v1/price-lists/route"
import { prisma } from "@/core/tenancy/infra/prisma"
import { getVoucherRedemptionRepository } from "@/modules/promotions/infra/voucher-redemption-repository"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"
const params = (id: string) => ({ params: Promise.resolve({ id }) })

/**
 * Cách ly tenant cho Phát hành mã giảm giá (`voucher_batches`, `vouchers`, `voucher_redemptions`)
 * và Bảng giá sản phẩm (`pricing_rules` khoá `price_list:`): tổ chức khác → 404, không phải 403.
 */
describe("cách ly tenant — mã giảm giá và bảng giá", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  async function issue(t: Tenant, body: Record<string, unknown>) {
    return createBatch(withSession(`${BASE}/vouchers/batches`, t.token, {
      method: "POST",
      body: JSON.stringify({ name: "Tri ân Tết", discount_type: "PERCENTAGE", discount_value: 10, ...body }),
    }))
  }

  it("đợt mã của tổ chức A: B không xem, không tạm dừng, không tải được (404)", async () => {
    const res = await issue(a, { mode: "UNIQUE", quantity: 5, code_prefix: "TET", usage_limit: 1 })
    expect(res.status).toBe(201)
    const { id } = (await readJson(res)) as { id: string }

    expect((await getBatch(withSession(`${BASE}/vouchers/batches/${id}`, a.token), params(id))).status).toBe(200)
    expect((await getBatch(withSession(`${BASE}/vouchers/batches/${id}`, b.token), params(id))).status).toBe(404)
    expect((await exportBatch(withSession(`${BASE}/vouchers/batches/${id}/export`, b.token), params(id))).status).toBe(404)
    const pause = await patchBatch(
      withSession(`${BASE}/vouchers/batches/${id}`, b.token, { method: "PATCH", body: JSON.stringify({ is_active: false }) }),
      params(id),
    )
    expect(pause.status).toBe(404)
    expect(await prisma.vouchers.count({ where: { batch_id: id, is_active: true } })).toBe(5)

    const listB = (await readJson(await listBatches(withSession(`${BASE}/vouchers/batches`, b.token)))) as { batches: unknown[] }
    expect(listB.batches).toHaveLength(0)
  })

  it("cùng một mã chung được dùng ở hai tổ chức, trong một tổ chức thì trùng", async () => {
    expect((await issue(a, { mode: "SHARED", shared_code: "TET2027" })).status).toBe(201)
    expect((await issue(b, { mode: "SHARED", shared_code: "TET2027" })).status).toBe(201)
    expect((await issue(a, { mode: "SHARED", shared_code: "tet2027" })).status).toBe(400)
  })

  it("trừ lượt không vượt tổng lượt khi nhiều đơn cùng lúc; huỷ đơn trả lại lượt", async () => {
    const { id } = (await readJson(await issue(a, { mode: "SHARED", shared_code: "FLASH", usage_limit: 2 }))) as { id: string }
    const voucher = await prisma.vouchers.findFirstOrThrow({ where: { batch_id: id } })
    const claim = (orderId: string) =>
      prisma.$transaction((tx) => getVoucherRedemptionRepository(tx).claim({ organizationId: a.organizationId, voucherId: voucher.id, orderId, customerId: null }))

    // Đơn và khách phải có thật: vouchers.order_id, voucher_redemptions.order_id/customer_id có khoá ngoại.
    const orders = await Promise.all(["V1", "V2", "V3", "V4"].map((code) => makeOrder(a, code)))
    const results = await Promise.all(orders.map(claim))
    expect(results.filter(Boolean)).toHaveLength(2)
    expect(await prisma.vouchers.findUniqueOrThrow({ where: { id: voucher.id } })).toMatchObject({ used_count: 2, is_used: true })

    // Tổ chức khác không trả được lượt của đơn tổ chức A
    const claimedOrder = (await prisma.voucher_redemptions.findFirstOrThrow({ where: { voucher_id: voucher.id } })).order_id
    await prisma.$transaction((tx) => getVoucherRedemptionRepository(tx).releaseForOrder(b.organizationId, claimedOrder))
    expect((await prisma.vouchers.findUniqueOrThrow({ where: { id: voucher.id } })).used_count).toBe(2)

    await prisma.$transaction((tx) => getVoucherRedemptionRepository(tx).releaseForOrder(a.organizationId, claimedOrder))
    expect(await prisma.vouchers.findUniqueOrThrow({ where: { id: voucher.id } })).toMatchObject({ used_count: 1, is_used: false })
  })

  it("giới hạn lượt mỗi khách", async () => {
    const { id } = (await readJson(await issue(a, { mode: "SHARED", shared_code: "MOT", per_customer_limit: 1 }))) as { id: string }
    const voucher = await prisma.vouchers.findFirstOrThrow({ where: { batch_id: id } })
    const claim = (orderId: string) =>
      prisma.$transaction((tx) => getVoucherRedemptionRepository(tx).claim({ organizationId: a.organizationId, voucherId: voucher.id, orderId, customerId: customer.id }))
    const customer = await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-0001", name: "Khách 1", phone: "0900000001" } })
    const [o1, o2] = await Promise.all([makeOrder(a, "M1"), makeOrder(a, "M2")])
    expect(await Promise.all([claim(o1), claim(o2)])).toEqual(expect.arrayContaining([true, false]))
  })

  it("bảng giá của tổ chức A: B không xem, không tắt được (404)", async () => {
    const res = await createPriceList(withSession(`${BASE}/price-lists`, a.token, { method: "POST", body: JSON.stringify({ name: "Bảng giá Tết" }) }))
    expect(res.status).toBe(201)
    const { id } = (await readJson(res)) as { id: string }

    expect((await getPriceList(withSession(`${BASE}/price-lists/${id}`, a.token), params(id))).status).toBe(200)
    expect((await getPriceList(withSession(`${BASE}/price-lists/${id}`, b.token), params(id))).status).toBe(404)
    const off = await patchPriceList(
      withSession(`${BASE}/price-lists/${id}`, b.token, { method: "PATCH", body: JSON.stringify({ active: false }) }),
      params(id),
    )
    expect(off.status).toBe(404)
    const listB = (await readJson(await listPriceLists(withSession(`${BASE}/price-lists`, b.token)))) as { data: unknown[] }
    expect(listB.data).toHaveLength(0)
  })
})

async function makeOrder(tenant: Tenant, code: string): Promise<string> {
  const order = await prisma.orders.create({
    data: { organization_id: tenant.organizationId, code, created_by: tenant.userId, total_vnd: 0, balance_vnd: 0 },
    select: { id: true },
  })
  return order.id
}
