import { createECDH, randomBytes } from "node:crypto"
import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { DELETE as unsubscribe, GET as status, POST as subscribe } from "@/app/api/v1/notification/push-subscriptions/route"
import { PushSubscriptionRepository } from "@/modules/notification/infra/push-subscription-repository"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * `push_subscriptions` (checklist 4.30): thiết bị nhận Web Push của chính người gọi trong tổ chức của phiên.
 * Không đọc / xoá được thiết bị của tổ chức khác; endpoint phải là dịch vụ đẩy thật.
 */
const URL = "http://localhost/api/v1/notification/push-subscriptions"

function device(n: number) {
  const ua = createECDH("prime256v1")
  ua.generateKeys()
  return { endpoint: `https://fcm.googleapis.com/fcm/send/thiet-bi-${n}`, keys: { p256dh: ua.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } }
}

describe("cách ly tenant — thiết bị nhận Web Push", () => {
  let a: Tenant
  let b: Tenant
  const send = (t: Tenant, method: string, body: unknown) => withSession(URL, t.token, { method, body: JSON.stringify(body) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("A bật nhận tin → dòng gắn tổ chức + người của phiên; B không thấy, không xoá được", async () => {
    const d = device(1)
    expect((await subscribe(send(a, "POST", d))).status).toBe(200)
    const row = await prisma.push_subscriptions.findFirstOrThrow({ where: { endpoint: d.endpoint } })
    expect(row).toMatchObject({ organization_id: a.organizationId, user_id: a.userId })

    const statusB = await readJson(await status(withSession(`${URL}?endpoint=${encodeURIComponent(d.endpoint)}`, b.token)))
    expect(statusB.data).toMatchObject({ devices: 0, subscribed: false, available: false, public_key: null })

    const removed = await readJson(await unsubscribe(send(b, "DELETE", { endpoint: d.endpoint })))
    expect(removed.data).toEqual({ removed: false })
    expect(await prisma.push_subscriptions.count({ where: { organization_id: a.organizationId } })).toBe(1)

    const statusA = await readJson(await status(withSession(`${URL}?endpoint=${encodeURIComponent(d.endpoint)}`, a.token)))
    expect(statusA.data).toMatchObject({ devices: 1, subscribed: true })
  })

  it("thân yêu cầu không đổi được tổ chức; người nhận chỉ lấy thiết bị trong đúng tổ chức", async () => {
    const d = device(2)
    const res = await subscribe(send(a, "POST", { ...d, organization_id: b.organizationId }))
    expect(res.status).toBe(200)
    expect(await prisma.push_subscriptions.count({ where: { organization_id: b.organizationId } })).toBe(0)
    const repo = new PushSubscriptionRepository()
    expect(await repo.listForRecipient(b.organizationId, a.userId)).toEqual([])
    expect((await repo.listForRecipient(a.organizationId, a.userId)).map((r) => r.endpoint)).toEqual([d.endpoint])
  })

  it("endpoint không phải dịch vụ đẩy thật → 422, không lưu", async () => {
    const bad = { ...device(3), endpoint: "https://169.254.169.254/latest/meta-data" }
    expect((await subscribe(send(a, "POST", bad))).status).toBe(422)
    expect(await prisma.push_subscriptions.count()).toBe(0)
  })
})
