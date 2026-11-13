import { randomUUID } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { pushDueDeliveryReminders } from "@/modules/coordinator/use-cases/push-delivery-reminders"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * 4.32 — tin nhắc giao M1/M2 do cron đẩy: chỉ tới thành viên của tổ chức có đơn, mỗi mốc một lần, CSDL thật.
 */
describe("đẩy tin nhắc giao: cách ly tổ chức và chống gửi trùng", () => {
  let a: Tenant
  let b: Tenant
  const now = new Date()

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  async function orderDueIn(t: Tenant, minutes: number, code: string) {
    await prisma.orders.create({
      data: {
        id: randomUUID(), organization_id: t.organizationId, code, source: "BROCHURE", status: "CONFIRMED",
        total_vnd: 100_000, paid_vnd: 100_000, balance_vnd: 0, created_by: "test",
        delivery_window: { targetAt: new Date(now.getTime() + minutes * 60_000).toISOString() },
      },
    })
  }

  it("M1 vừa tới (giao sau 110 phút) → tin vào hộp thư của tổ chức có đơn, không sang tổ chức khác, không gửi lại", async () => {
    await orderDueIn(a, 110, "DH-A-1")
    await orderDueIn(b, 600, "DH-B-1") // còn xa giờ giao: chưa tới mốc nào

    const first = await pushDueDeliveryReminders(now)
    expect(first).toMatchObject({ pushed: 1, failedOrganizations: 0 })

    const inboxA = await prisma.notification_inbox.findMany({ where: { organization_id: a.organizationId, event_key: "DELIVERY_REMINDER_DUE" } })
    expect(inboxA.length).toBeGreaterThan(0)
    expect(inboxA[0]?.title).toContain("DH-A-1")
    expect(inboxA[0]?.deep_link).toBe("/dieu-phoi")
    expect(await prisma.notification_inbox.count({ where: { organization_id: b.organizationId } })).toBe(0)

    const again = await pushDueDeliveryReminders(new Date(now.getTime() + 5 * 60_000))
    expect(again.pushed).toBe(0)
    expect(await prisma.notification_inbox.count({ where: { event_key: "DELIVERY_REMINDER_DUE" } })).toBe(inboxA.length)
  })

  it("mốc đã xác nhận ở thanh nhắc thì không đẩy tin", async () => {
    await orderDueIn(a, 110, "DH-A-2")
    const order = await prisma.orders.findFirstOrThrow({ where: { organization_id: a.organizationId } })
    await prisma.order_coordinations.create({
      data: {
        organization_id: a.organizationId, order_id: order.id,
        metadata: { reminders: { M1: { status: "ACKNOWLEDGED", acknowledgedAt: now.toISOString() } } },
      },
    })
    expect((await pushDueDeliveryReminders(now)).pushed).toBe(0)
  })
})
