import { afterAll, beforeEach, describe, expect, it } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { ingestOrder } from "@/modules/orders/use-cases/ingest-order"
import { MARKETPLACE_PAYMENT_METHOD, recordChannelPrepayment } from "@/modules/orders/use-cases/record-channel-prepayment"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * Audit BL-34, PO 12/11/2026: đơn sàn đã trả tiền vào sổ như đơn chưa thu (`paid_vnd = 0`); sàn che SĐT người nhận
 * làm đơn bị từ chối vì "không phải số Việt Nam". Nay: SĐT không kiểm định dạng với nguồn kênh bán; khoản sàn đã thu
 * ghi vào sổ thu (hình thức sàn, mã tham chiếu = mã đơn sàn), đơn sang Đã xác nhận + Điều phối như đơn đã thu thường.
 */
describe("đơn kênh bán đã trả trên sàn", () => {
  let a: Tenant
  let b: Tenant
  const system = (t: Tenant): TenantContext => ({ organizationId: t.organizationId, workspaceId: "system", userId: "system", branchId: null, capabilities: new Set() })
  const channelOrder = (t: Tenant) =>
    ingestOrder(system(t), {
      source: "CHANNEL",
      items: [{ description: "Bình gốm", quantity: 2, unitPriceVnd: 150_000 }],
      deliveryAddress: { recipientName: "N***", phone: "******789", street: "Quận 1" },
    })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("san-a")
    b = await createTenant("san-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("SĐT bị sàn che vẫn nhận đơn; đơn nhập tay vẫn phải là số Việt Nam", async () => {
    expect((await channelOrder(a)).totalVnd).toBe(300_000)
    await expect(
      ingestOrder(a.ctx, { source: "MANUAL", items: [{ description: "Bình gốm", quantity: 1, unitPriceVnd: 0 }], deliveryAddress: { recipientName: "An", phone: "******789", street: "Quận 1" } }),
    ).rejects.toMatchObject({ code: "VALIDATION_FAILED" })
  })

  it("ghi khoản sàn đã thu → đã thu đủ, Đã xác nhận, sang Điều phối", async () => {
    const order = await channelOrder(a)
    await recordChannelPrepayment(system(a), { orderId: order.id, amountVnd: 300_000, externalOrderId: "SAN-001", channelLabel: "Sàn thử" })
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.id }, include: { coordination: true } })
    expect({ status: row.status, paid: Number(row.paid_vnd), balance: Number(row.balance_vnd) }).toEqual({ status: "CONFIRMED", paid: 300_000, balance: 0 })
    expect(row.coordination?.stage).toBe("INTAKE")
    const payment = await prisma.order_payments.findFirstOrThrow({ where: { order_id: order.id } })
    expect({ method: payment.payment_method, reference: payment.reference, status: payment.status }).toEqual({ method: MARKETPLACE_PAYMENT_METHOD, reference: "SAN-001", status: "CONFIRMED" })
  })

  it("không ghi được vào đơn của tổ chức khác (404); số 0 → không ghi", async () => {
    const order = await channelOrder(a)
    await expect(recordChannelPrepayment(system(b), { orderId: order.id, amountVnd: 300_000, externalOrderId: "SAN-002", channelLabel: "Sàn thử" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(await recordChannelPrepayment(system(a), { orderId: order.id, amountVnd: 0, externalOrderId: "SAN-002", channelLabel: "Sàn thử" })).toBeNull()
    expect(await prisma.order_payments.count({ where: { order_id: order.id } })).toBe(0)
  })
})
