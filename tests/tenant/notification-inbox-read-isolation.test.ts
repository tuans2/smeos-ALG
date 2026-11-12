import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as readInbox } from "@/app/api/v1/notification/inbox/[id]/read/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Cách ly tenant khi đánh dấu đã đọc tin trong hộp thư thông báo (đặc tả 07 mục 33). */
describe("cách ly tenant — đánh dấu đã đọc thông báo", () => {
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

  it("notification_inbox: không đánh dấu được tin của tổ chức khác", async () => {
    const item = await prisma.notification_inbox.create({
      data: { user_id: a.userId, organization_id: a.organizationId, event_key: "ORDER_RECEIVED", title: "Đơn mới", message: "x" },
    })
    const req = withSession(`http://localhost/api/v1/notification/inbox/${item.id}/read`, b.token, { method: "PATCH", body: "{}" })
    await readInbox(req, { params: Promise.resolve({ id: item.id }) })
    const after = await prisma.notification_inbox.findUniqueOrThrow({ where: { id: item.id } })
    expect(after.is_read).toBe(false)
  })
})
