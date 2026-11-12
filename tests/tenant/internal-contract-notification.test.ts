import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-notification"
import { GET as listChannels } from "@/app/api/v1/notification/channels/route"
import { GET as listEvents } from "@/app/api/v1/notification/events/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { PATCH as readOne } from "@/app/api/v1/notification/inbox/[id]/read/route"
import { POST as readAll } from "@/app/api/v1/notification/inbox/mark-all-read/route"
// @release-strip-end
import { GET as listInbox } from "@/app/api/v1/notification/inbox/route"
import { DELETE as orgUnlock, GET as orgLocks, POST as orgLock } from "@/app/api/v1/notification/org-hard-locks/route"
import { GET as orgPolicy, PATCH as patchOrgPolicy } from "@/app/api/v1/notification/org-policy/route"
import { GET as prefs, PATCH as patchPrefs } from "@/app/api/v1/notification/preferences/route"
import { GET as storeDefaults, PATCH as patchStoreDefaults } from "@/app/api/v1/notification/store-defaults/route"
import { DELETE as storeUnlock, GET as storeLocks, POST as storeLock } from "@/app/api/v1/notification/store-hard-locks/route"
import { GET as stream } from "@/app/api/v1/notification/stream/route"
import { getDefaultVisibleEvents } from "@/modules/notification/domain/events"
import { getNotificationPreferenceRepository } from "@/modules/notification/infra/notification-preference-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi `/notification/*` (OpenAPI nội bộ, PO 07/11/2026) trên CSDL thật. */
const BASE = "http://localhost/api/v1/notification"
const ps = (id: string) => ({ params: Promise.resolve({ id }) })

describe("hợp đồng — thông báo", () => {
  let t: Tenant
  let eventKey: string
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-thong-bao")
    eventKey = getDefaultVisibleEvents("STORE")[0]!.key
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("danh mục sự kiện và kênh", async () => {
    const events = await expectContract(await listEvents(get("/events")), 200, R.eventsResponse, "notif-events")
    expect((events.data as unknown[]).length).toBeGreaterThan(0)
    await expectContract(await listEvents(get("/events?tier=MOTHER")), 200, R.eventsResponse, "notif-events-mother")
    await expectContract(await listChannels(get("/channels")), 200, R.channelsResponse, "notif-channels")
  })

  it("hộp thư: danh sách, đọc một tin, đọc hết", async () => {
    const repo = getNotificationPreferenceRepository()
    const item = await repo.createInboxItem({ userId: t.userId, organizationId: t.organizationId, eventKey, title: "Đơn mới", message: "Có đơn mới", deepLink: "/don-hang" })
    await repo.createInboxItem({ userId: t.userId, organizationId: t.organizationId, eventKey, title: "Đơn mới 2", message: "Có đơn mới" })
    const inbox = await expectContract(await listInbox(get("/inbox?page=1&limit=10")), 200, R.inboxResponse, "notif-inbox")
    expect((inbox.data as unknown[]).length).toBe(2)
    // @release-strip
    await expectContract(await readOne(send(`/inbox/${item.id}/read`, "PATCH"), ps(item.id)), 200, R.inboxReadResponse, "notif-read")
    // @release-strip-end
    await expectContract(await listInbox(get("/inbox?unreadOnly=true")), 200, R.inboxResponse, "notif-inbox-unread")
    // @release-strip
    await expectContract(await readAll(send("/inbox/mark-all-read", "POST")), 200, R.inboxReadAllResponse, "notif-read-all")
    // @release-strip-end
  })

  it("luồng SSE mở được và gửi sự kiện connected", async () => {
    const abort = new AbortController()
    const res = await stream(withSession(`${BASE}/stream`, t.token, { signal: abort.signal }))
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/event-stream")
    const reader = res.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value)
    expect(first).toContain("event: connected")
    abort.abort()
    await reader.cancel()
  })

  it("tuỳ chọn, chính sách tổ chức, mặc định cửa hàng", async () => {
    await expectContract(await patchPrefs(send("/preferences", "PATCH", { eventKey, channel: "EMAIL", enabled: false })), 200, R.updatedResponse, "notif-pref-patch")
    await expectContract(await prefs(get("/preferences")), 200, R.preferencesResponse, "notif-prefs")
    await expectContract(await patchOrgPolicy(send("/org-policy", "PATCH", { eventKey, channel: "EMAIL", roleKey: "*", enabled: true, priorityOverride: "URGENT" })), 200, R.updatedResponse, "notif-org-patch")
    await expectContract(await orgPolicy(get("/org-policy")), 200, R.preferencesResponse, "notif-org")
    await expectContract(
      await patchStoreDefaults(send("/store-defaults", "PATCH", { eventKey, channel: "EMAIL", roleKey: "owner", enabled: true, scheduleStart: "08:00", scheduleEnd: "20:00" })),
      200, R.updatedResponse, "notif-store-patch"
    )
    await expectContract(await storeDefaults(get("/store-defaults?roleKey=owner")), 200, R.preferencesResponse, "notif-store")
  })

  it("khoá cứng tầng chuỗi và cửa hàng; tuỳ chọn bị khoá → 422 LOCKED_BY_UPPER", async () => {
    for (const [lock, list, unlock, tier] of [[orgLock, orgLocks, orgUnlock, "org"], [storeLock, storeLocks, storeUnlock, "store"]] as const) {
      await expectContract(await lock(send(`/${tier}-hard-locks`, "POST", { eventKey, channel: "SMS", enabled: false, reason: "Tiệm không dùng SMS" })), 200, R.hardLockSetResponse, `notif-${tier}-lock`)
      const locks = await expectContract(await list(get(`/${tier}-hard-locks`)), 200, R.hardLocksResponse, `notif-${tier}-locks`)
      expect((locks.data as unknown[]).length).toBe(1)
      const pref = await patchPrefs(send("/preferences", "PATCH", { eventKey, channel: "SMS", enabled: true }))
      // Cả khoá tầng chuỗi lẫn tầng cửa hàng đều chặn tuỳ chọn cá nhân (audit API §15 — trước đây khoá cửa hàng lọt qua)
      expect(pref.status).toBe(422)
      const err = (await readJson(pref)).error as { code: string; details: { violation: string } }
      expect(err.code).toBe("UNPROCESSABLE_ENTITY")
      expect(err.details.violation).toBe("LOCKED_BY_UPPER")
      await expectContract(await unlock(send(`/${tier}-hard-locks`, "DELETE", { eventKey, channel: "SMS" })), 200, R.hardLockRemovedResponse, `notif-${tier}-unlock`)
      // Gỡ lần hai (không còn khoá) vẫn 200.
      expect((await unlock(send(`/${tier}-hard-locks`, "DELETE", { eventKey, channel: "SMS" }))).status).toBe(200)
    }
  })
})
