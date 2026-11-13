import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET, PUT } from "@/app/api/v1/creative-production/providers/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const URL_ = "http://localhost/api/v1/creative-production/providers"

/** Thứ tự ưu tiên nhà cung cấp của tiệm (PO 25/09/2026) — lưu theo tổ chức, gác `U2`, có audit. */
describe("cách ly tenant — thứ tự ưu tiên nhà cung cấp Creative Studio", () => {
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

  const put = (t: Tenant, body: unknown) =>
    PUT(withSession(URL_, t.token, { method: "PUT", body: JSON.stringify(body) }))

  it("mặc định: nhà cung cấp chất lượng cao đứng đầu, cục bộ chỉ là đường lùi", async () => {
    const body = await readJson(await GET(withSession(URL_, a.token)))
    const kinds = body.kinds as Record<string, { order: string[]; local_fallback: { key: string } | null }>
    expect(kinds.video!.order[0]).toBe("veo")
    expect(kinds.video!.order).not.toContain("local_cinematic")
    expect(kinds.video!.local_fallback?.key).toBe("local_cinematic")
    expect(kinds.content!.order[0]).toBe("claude_opus")
  })

  it("đặt thứ tự của tổ chức A không đụng tổ chức B, và ghi audit", async () => {
    const res = await put(a, { kind: "video", order: ["kling", "runway"] })
    expect(res.status).toBe(200)
    const view = await readJson(res)
    expect((view.kinds as Record<string, { order: string[] }>).video!.order).toEqual(["kling", "runway", "veo", "luma"])

    const cuaB = await readJson(await GET(withSession(URL_, b.token)))
    expect((cuaB.kinds as Record<string, { order: string[] }>).video!.order[0]).toBe("veo")

    const audit = await prisma.audit_logs.findMany({ where: { organization_id: a.organizationId, action: "creative.providers.set_order" } })
    expect(audit).toHaveLength(1)
  })

  it("khoá lạ / đường cục bộ / loại lạ bị từ chối 400", async () => {
    expect((await put(a, { kind: "video", order: ["local_cinematic"] })).status).toBe(400)
    expect((await put(a, { kind: "khong_co", order: ["veo"] })).status).toBe(400)
    expect((await put(a, { kind: "video", order: [] })).status).toBe(400)
  })
})
