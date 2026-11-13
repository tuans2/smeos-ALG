import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { PATCH as patchOrganization } from "@/app/api/v1/organizations/current/route"
import {
  listLinkedTelegramChatIds,
  listUnlinkedTelegramChats,
  rememberLinkedTelegramChats,
  unlinkTelegramChat,
} from "@/modules/greeting-card/infra/telegram-linked-chats"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, withSession, type Tenant } from "../helpers/fixtures"

/** Chat Telegram đã liên kết: lưu theo tổ chức, gộp không trùng, tenant không tự ghi được (rà soát cụm G). */
describe("chat Telegram đã liên kết", () => {
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

  it("gộp không trùng, giữ các khoá settings khác, không lẫn tổ chức", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { industry: "FLORIST" } } })
    await rememberLinkedTelegramChats(a.organizationId, ["-100", "-200"])
    await rememberLinkedTelegramChats(a.organizationId, ["-200", "-300"])
    expect((await listLinkedTelegramChatIds(a.organizationId)).sort()).toEqual(["-100", "-200", "-300"])
    expect(await listLinkedTelegramChatIds(b.organizationId)).toEqual([])
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    expect((org.settings as Record<string, unknown>).industry).toBe("FLORIST")
  })

  it("tenant không tự thêm chat qua PATCH settings", async () => {
    const res = await patchOrganization(
      withSession("http://localhost/api/v1/organizations/current", a.token, {
        method: "PATCH",
        body: JSON.stringify({ settings: { telegram_linked_chat_ids: ["-999"] } }),
      })
    )
    expect(res.status).toBeGreaterThanOrEqual(400)
    expect(await listLinkedTelegramChatIds(a.organizationId)).toEqual([])
  })

  it("gỡ chat: chỉ bỏ chat đó của tổ chức đó, ghi thời điểm gỡ, giữ khoá settings khác", async () => {
    await prisma.organizations.update({ where: { id: a.organizationId }, data: { settings: { industry: "FLORIST" } } })
    await rememberLinkedTelegramChats(a.organizationId, ["-100", "-200"])
    await rememberLinkedTelegramChats(b.organizationId, ["-100"])
    await unlinkTelegramChat(a.organizationId, "-100")
    expect(await listLinkedTelegramChatIds(a.organizationId)).toEqual(["-200"])
    expect(await listLinkedTelegramChatIds(b.organizationId)).toEqual(["-100"])
    expect(Object.keys(await listUnlinkedTelegramChats(a.organizationId))).toEqual(["-100"])
    const org = await prisma.organizations.findUniqueOrThrow({ where: { id: a.organizationId } })
    expect((org.settings as Record<string, unknown>).industry).toBe("FLORIST")
  })
})
