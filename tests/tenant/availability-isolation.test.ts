import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { DELETE as deleteBlock } from "@/app/api/v1/availability/blocks/[id]/route"
import { POST as createBlock } from "@/app/api/v1/availability/blocks/route"
import { StaffNotificationRepository } from "@/modules/greeting-card/infra/staff-notification-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/availability/blocks"

async function seedProduct(t: Tenant, code: string): Promise<string> {
  const product = await prisma.products.create({
    data: { organization_id: t.organizationId, code, name: `Phòng ${code}`, status: "ACTIVE" },
  })
  return product.id
}

function postBlock(token: string, productId: string): Request {
  return withSession(BASE, token, {
    method: "POST",
    body: JSON.stringify({ product_id: productId, check_in_date: "2026-11-01", check_out_date: "2026-11-03", note: "Bảo trì" }),
  })
}

/** Cách ly tenant cho hai bảng thêm trong đợt smeOS đa ngành (đặc tả 07 mục 30). */
describe("cách ly tenant — product_bookings và staff_notifications", () => {
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

  it("product_bookings: khoá ngày lên sản phẩm của tổ chức khác → 404, không ghi dòng nào", async () => {
    const productOfA = await seedProduct(a, "P-A")
    const res = await createBlock(postBlock(b.token, productOfA))
    expect(res.status).toBe(404)
    expect(await prisma.product_bookings.count()).toBe(0)
  })

  it("product_bookings: tổ chức khác không gỡ được khoá ngày của A (404), khoá vẫn ACTIVE", async () => {
    const productOfA = await seedProduct(a, "P-A")
    const created = await readJson(await createBlock(postBlock(a.token, productOfA)))
    const blockId = created.id as string

    const res = await deleteBlock(withSession(`${BASE}/${blockId}`, b.token, { method: "DELETE" }), {
      params: Promise.resolve({ id: blockId }),
    })
    expect(res.status).toBe(404)
    const row = await prisma.product_bookings.findUniqueOrThrow({ where: { id: blockId } })
    expect(row.status).toBe("ACTIVE")
    expect(row.organization_id).toBe(a.organizationId)
  })

  it("staff_notifications: nhật ký của A không lẫn vào danh sách của B", async () => {
    const repo = new StaffNotificationRepository()
    await repo.recordStaffNotification({ organizationId: a.organizationId, eventKey: "READY", channel: "APP_INBOX", status: "SENT", title: "Đơn A" })
    await repo.recordStaffNotification({ organizationId: b.organizationId, eventKey: "READY", channel: "APP_INBOX", status: "SENT", title: "Đơn B" })

    const listB = await repo.listStaffNotifications(b.organizationId)
    expect(listB.map((r) => r.title)).toEqual(["Đơn B"])
  })
})
