import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listInbox } from "@/app/api/v1/notification/inbox/route"
import { GET as getPrefs, PATCH as patchPrefs } from "@/app/api/v1/notification/preferences/route"
import { GET as getOrgPolicy, PATCH as patchOrgPolicy } from "@/app/api/v1/notification/org-policy/route"
import { GET as getStoreDefaults, PATCH as patchStoreDefaults } from "@/app/api/v1/notification/store-defaults/route"
import { POST as postStoreLock } from "@/app/api/v1/notification/store-hard-locks/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Cách ly tenant cho 4 bảng thông báo có `organization_id` (đặc tả 07 mục 33):
 * notification_inbox, notification_user_preferences, notification_org_policies,
 * notification_store_defaults. Kèm AUD-015: khoá cứng của tổ chức khác không chặn tổ chức này.
 * Đánh dấu đã đọc: `notification-inbox-read-isolation.test.ts` (route đó không có trong bản giao GD1).
 */
describe("cách ly tenant — thông báo đa tầng", () => {
  let a: Tenant
  let b: Tenant
  const url = (p: string) => `http://localhost/api/v1/notification/${p}`
  const send = (t: Tenant, p: string, method: string, body: unknown) =>
    withSession(url(p), t.token, { method, body: JSON.stringify(body) })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("notification_inbox: không đọc được tin của tổ chức khác", async () => {
    await prisma.notification_inbox.create({
      data: { user_id: a.userId, organization_id: a.organizationId, event_key: "ORDER_RECEIVED", title: "Đơn mới", message: "x" },
    })
    const listA = await readJson(await listInbox(withSession(url("inbox"), a.token)))
    expect((listA.data as unknown[]).length).toBe(1)
    const listB = await readJson(await listInbox(withSession(url("inbox"), b.token)))
    expect(listB.data).toEqual([])
  })

  it("notification_user_preferences / org_policies / store_defaults: ghi của A không lộ sang B", async () => {
    const pref = { event_key: "ORDER_RECEIVED", channel: "EMAIL", enabled: false }
    expect((await patchPrefs(send(a, "preferences", "PATCH", pref))).status).toBe(200)
    expect((await patchOrgPolicy(send(a, "org-policy", "PATCH", { ...pref, role_key: "*" }))).status).toBe(200)
    expect((await patchStoreDefaults(send(a, "store-defaults", "PATCH", { ...pref, role_key: "*" }))).status).toBe(200)

    for (const get of [getPrefs, getOrgPolicy, getStoreDefaults]) {
      const body = await readJson(await get(withSession(url("x"), b.token)))
      expect(body.data).toEqual([])
    }
    expect(await prisma.notification_user_preferences.count({ where: { organization_id: b.organizationId } })).toBe(0)
    expect(await prisma.notification_org_policies.count({ where: { organization_id: a.organizationId } })).toBe(1)
    expect(await prisma.notification_store_defaults.count({ where: { organization_id: a.organizationId } })).toBe(1)
  })

  it("AUD-015: khoá cứng cửa hàng của A không chặn tuỳ chọn của B và không lộ lý do", async () => {
    await postStoreLock(send(a, "store-hard-locks", "POST", {
      event_key: "ORDER_RECEIVED", channel: "EMAIL", enabled: false, reason: "ghi chú nội bộ của A",
    }))
    const res = await patchPrefs(send(b, "preferences", "PATCH", { event_key: "ORDER_RECEIVED", channel: "EMAIL", enabled: true }))
    expect(res.status).toBe(200)
    expect(JSON.stringify(await readJson(res))).not.toContain("ghi chú nội bộ của A")
  })
})
