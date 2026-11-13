import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as getHub } from "@/app/api/v1/integrations/route"
import { POST as connect } from "@/app/api/v1/integrations/connections/route"
import { DELETE as disconnect } from "@/app/api/v1/integrations/connections/[id]/route"
import { GET as listEvents } from "@/app/api/v1/integrations/connections/[id]/events/route"
import { POST as replay } from "@/app/api/v1/integrations/events/[id]/replay/route"
import { POST as webhook } from "@/app/api/v1/public/integrations/[connector]/[ref]/route"
import { signEcho } from "@/modules/integration-hub/adapters/connectors/test-echo-connector"
import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/integrations"
const SECRET = "tenant-echo-secret-0123456789"
const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) })

async function connectEcho(t: Tenant): Promise<{ id: string; connectionRef: string }> {
  const res = await connect(
    withSession(`${BASE}/connections`, t.token, { method: "POST", body: JSON.stringify({ connector_key: "test_echo", secret: SECRET }) })
  )
  expect(res.status).toBe(201)
  const body = (await readJson(res)) as { connection: { id: string; connectionRef: string } }
  return body.connection
}

describe("cách ly tenant — Trung tâm Tích hợp (GĐ1)", () => {
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

  it("kết nối của A không hiện, không ngắt được, không đọc nhật ký được từ B (404)", async () => {
    const conn = await connectEcho(a)

    const hubB = (await readJson(await getHub(withSession(BASE, b.token)))) as { connections: unknown[] }
    expect(hubB.connections).toHaveLength(0)

    const del = await disconnect(withSession(`${BASE}/connections/${conn.id}`, b.token, { method: "DELETE" }), params({ id: conn.id }))
    expect(del.status).toBe(404)

    const ev = await listEvents(withSession(`${BASE}/connections/${conn.id}/events`, b.token), params({ id: conn.id }))
    expect(ev.status).toBe(404)

    const hubA = (await readJson(await getHub(withSession(BASE, a.token)))) as { connections: Array<Record<string, unknown>> }
    expect(hubA.connections).toHaveLength(1)
    expect(JSON.stringify(hubA)).not.toContain(SECRET)
  })

  it("khoá lưu trong DB đã mã hoá; webhook ghi sự kiện vào đúng tổ chức của kết nối", async () => {
    const conn = await connectEcho(a)
    const row = await prisma.integration_connections.findUniqueOrThrow({ where: { id: conn.id } })
    expect(row.credential_encrypted).not.toContain(SECRET)
    expect(row.organization_id).toBe(a.ctx.organizationId)

    const body = JSON.stringify({ id: "evt-1", type: "echo.fail" })
    const sig = signEcho(body, SECRET, Math.floor(Date.now() / 1000))
    const url = `http://localhost/api/v1/public/integrations/test_echo/${conn.connectionRef}`
    const res = await webhook(new Request(url, { method: "POST", body, headers: { "x-echo-signature": sig } }), params({ connector: "test_echo", ref: conn.connectionRef }))
    expect(res.status).toBe(200)
    const again = await webhook(new Request(url, { method: "POST", body, headers: { "x-echo-signature": sig } }), params({ connector: "test_echo", ref: conn.connectionRef }))
    expect(await readJson(again)).toEqual({ accepted: 0, duplicates: 1 })

    const events = await prisma.integration_events.findMany()
    expect(events).toHaveLength(1)
    expect(events[0]!.organization_id).toBe(a.ctx.organizationId)

    await prisma.integration_events.update({ where: { id: events[0]!.id }, data: { status: "DEAD" } })
    const replayB = await replay(withSession(`${BASE}/events/${events[0]!.id}/replay`, b.token, { method: "POST" }), params({ id: events[0]!.id }))
    expect(replayB.status).toBe(404)
    const replayA = await replay(withSession(`${BASE}/events/${events[0]!.id}/replay`, a.token, { method: "POST" }), params({ id: events[0]!.id }))
    expect(replayA.status).toBe(200)
  })

  it("trạng thái tích hợp sẵn có (SePay, API) chỉ hiện cho đúng tổ chức", async () => {
    await prisma.greeting_integrations.create({
      data: {
        organization_id: a.ctx.organizationId,
        payment_provider: "SEPAY",
        payment_webhook_key_hash: "hash-alpha",
        payment_webhook_key_hint: "abcd",
        payment_webhook_enabled: true,
      },
    })
    const hubA = (await readJson(await getHub(withSession(BASE, a.token)))) as { managedConnected: string[] }
    const hubB = (await readJson(await getHub(withSession(BASE, b.token)))) as { managedConnected: string[] }
    expect(hubA.managedConnected).toContain("sepay")
    expect(hubB.managedConnected).not.toContain("sepay")
    expect(JSON.stringify(hubA)).not.toContain("hash-alpha")
  })


  it("chữ ký sai bị từ chối và không ghi gì", async () => {
    const conn = await connectEcho(a)
    const body = JSON.stringify({ id: "evt-x" })
    const res = await webhook(
      new Request(`http://localhost/api/v1/public/integrations/test_echo/${conn.connectionRef}`, {
        method: "POST",
        body,
        headers: { "x-echo-signature": signEcho(body, "khoa-sai-0000000000000", Math.floor(Date.now() / 1000)) },
      }),
      params({ connector: "test_echo", ref: conn.connectionRef })
    )
    expect(res.status).toBe(401)
    expect(await prisma.integration_events.count()).toBe(0)
  })
})
