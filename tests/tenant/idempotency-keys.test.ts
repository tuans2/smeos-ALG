import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  IDEMPOTENCY_RETENTION_DAYS,
  claimIdempotencyKey,
  purgeExpiredIdempotencyKeys,
} from "@/core/idempotency/infra/idempotency-repository"
import { prisma } from "@/core/tenancy/infra/prisma"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/** E5.3 — khoá idempotent theo (tổ chức, phạm vi, khoá); không lẫn giữa các tổ chức. */
describe("khoá idempotent dùng chung", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("idem-a")
    b = await createTenant("idem-b")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("lần đầu được xử lý, lần hai bị chặn; cùng khoá ở tổ chức khác vẫn được xử lý", async () => {
    expect(await claimIdempotencyKey(a.organizationId, "webhook.facebook", "m.1")).toBe(true)
    expect(await claimIdempotencyKey(a.organizationId, "webhook.facebook", "m.1")).toBe(false)
    expect(await claimIdempotencyKey(b.organizationId, "webhook.facebook", "m.1")).toBe(true)
    expect(await claimIdempotencyKey(a.organizationId, "webhook.zalo", "m.1")).toBe(true)
  })

  it("gọi đồng thời cùng một khoá: đúng một lần được xử lý", async () => {
    const ketQua = await Promise.all(Array.from({ length: 5 }, () => claimIdempotencyKey(a.organizationId, "payment.test", "tx-1")))
    expect(ketQua.filter(Boolean)).toHaveLength(1)
  })

  it("dọn khoá cũ hơn hạn giữ, giữ khoá mới", async () => {
    await claimIdempotencyKey(a.organizationId, "webhook.zalo", "cu")
    await claimIdempotencyKey(a.organizationId, "webhook.zalo", "moi")
    const now = new Date()
    await prisma.idempotency_keys.updateMany({
      where: { key: "cu" },
      data: { created_at: new Date(now.getTime() - (IDEMPOTENCY_RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000) },
    })

    expect(await purgeExpiredIdempotencyKeys(now)).toBe(1)
    expect((await prisma.idempotency_keys.findMany()).map((k) => k.key)).toEqual(["moi"])
  })
})
