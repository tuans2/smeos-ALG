import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { withTenantDb } from "@/core/tenancy/db-context"
import { generateOrderCode, orderCodePrefix } from "@/modules/orders/domain/order-rules"
import { allocateOrderCodeNumber } from "@/modules/orders/infra/order-code-sequence"
import { createOrder } from "@/modules/orders/use-cases/create-order"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Đặc tả 07 §57 (12/11/2026): mã đơn `DH<yymmdd>-<số>` lấy số từ bộ đếm `order_code_sequences` theo tổ chức và ngày.
 * Thử tải O-9 cho thấy cách cũ (đếm đơn trong ngày + 1) trùng mã 70/100 lần khi 10 đơn của một chuỗi tạo cùng lúc.
 */
const item = { description: "Bó hồng", quantity: 1, unitPriceVnd: 400_000 }
const make = (t: Tenant) => withTenantDb(t.organizationId, () => createOrder(t.ctx, { items: [item] }))
const codes = async (t: Tenant) =>
  (await prisma.orders.findMany({ where: { organization_id: t.organizationId }, select: { code: true } })).map((o) => o.code).sort()

describe("bộ đếm mã đơn", () => {
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

  it("30 đơn tạo cùng lúc trong một tổ chức: đều thành công, mã liền nhau từ 0001, không trùng", async () => {
    const results = await Promise.allSettled(Array.from({ length: 30 }, () => make(a)))
    expect(results.filter((r) => r.status === "rejected")).toEqual([])
    const prefix = orderCodePrefix()
    expect(await codes(a)).toEqual(Array.from({ length: 30 }, (_, i) => `${prefix}${String(i + 1).padStart(4, "0")}`))
    const row = await prisma.order_code_sequences.findUnique({ where: { organization_id_prefix: { organization_id: a.organizationId, prefix } } })
    expect(row?.last_value).toBe(30)
  })

  it("mỗi tổ chức một bộ đếm: đơn của tổ chức khác không làm nhảy số", async () => {
    await Promise.all([make(a), make(a), make(b)])
    const prefix = orderCodePrefix()
    expect(await codes(a)).toEqual([`${prefix}0001`, `${prefix}0002`])
    expect(await codes(b)).toEqual([`${prefix}0001`])
  })

  it("chưa có bộ đếm mà trong ngày đã có đơn (trước khi deploy): bắt đầu sau số lớn nhất, không theo số đơn", async () => {
    const first = await make(a)
    await make(a)
    const prefix = orderCodePrefix()
    // Dữ liệu trước bộ đếm: không có dòng đếm, 2 đơn mà số lớn nhất là 0009 (cách cũ đếm đơn → 0003)
    await prisma.orders.update({ where: { id: first.id }, data: { code: `${prefix}0009` } })
    await prisma.order_code_sequences.deleteMany({ where: { organization_id: a.organizationId } })
    expect((await make(a)).code).toBe(`${prefix}0010`)
    expect((await make(a)).code).toBe(`${prefix}0011`)
  })

  it("mã lạ cùng tiền tố (không phải số) không làm hỏng việc cấp số", async () => {
    const prefix = orderCodePrefix()
    await withTenantDb(a.organizationId, () => allocateOrderCodeNumber(a.organizationId, prefix))
    await prisma.order_code_sequences.deleteMany({ where: { organization_id: a.organizationId } })
    const first = await make(a)
    await prisma.orders.update({ where: { id: first.id }, data: { code: `${prefix}NHAP` } })
    await prisma.order_code_sequences.deleteMany({ where: { organization_id: a.organizationId } })
    expect((await make(a)).code).toBe(generateOrderCode(1))
  })

  it("ngày khác dùng tiền tố khác → đếm lại từ 1", async () => {
    const yesterday = orderCodePrefix(new Date(Date.now() - 86_400_000))
    await prisma.order_code_sequences.create({ data: { organization_id: a.organizationId, prefix: yesterday, last_value: 57 } })
    expect((await make(a)).code).toBe(`${orderCodePrefix()}0001`)
  })
})
