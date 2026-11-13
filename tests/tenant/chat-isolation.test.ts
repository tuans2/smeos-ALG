import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listConversations, POST as createConversation } from "@/app/api/v1/chat/conversations/route"
import { GET as getMessages, POST as sendMessage } from "@/app/api/v1/chat/conversations/[id]/messages/route"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/chat"

describe("cách ly tenant — AI Chat Assistant M08 (P23)", () => {
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

  it("POST /chat/conversations rồi GET /chat/conversations/:id/messages chỉ đọc lại được bằng chính tổ chức đã tạo", async () => {
    const resCreate = await createConversation(
      withSession(`${BASE}/conversations`, a.token, {
        method: "POST",
        body: JSON.stringify({
          title: "Tư vấn khách hàng Lan Anh",
          channel: "WEB_WIDGET",
        }),
      })
    )
    expect(resCreate.status).toBe(201)
    const { conversation } = (await readJson(resCreate)) as { conversation: { id: string } }
    const id = conversation.id as string

    // Tổ chức A đọc được tin nhắn (ban đầu rỗng)
    const ownRead = await getMessages(withSession(`${BASE}/conversations/${id}/messages`, a.token), {
      params: Promise.resolve({ id }),
    })
    expect(ownRead.status).toBe(200)
    const ownData = (await readJson(ownRead)) as { messages?: unknown[] }
    expect(ownData.messages).toBeDefined()

    // Tổ chức B cố đọc -> 404
    const otherRead = await getMessages(withSession(`${BASE}/conversations/${id}/messages`, b.token), {
      params: Promise.resolve({ id }),
    })
    expect(otherRead.status).toBe(404)
  })

  it("Tổ chức B không thể gửi tin nhắn vào cuộc hội thoại của Tổ chức A (404)", async () => {
    const resCreate = await createConversation(
      withSession(`${BASE}/conversations`, a.token, {
        method: "POST",
        body: JSON.stringify({ title: "Hội thoại A" }),
      })
    )
    const { conversation } = (await readJson(resCreate)) as { conversation: { id: string } }
    const id = conversation.id as string

    // Tổ chức B cố gửi tin -> 404
    const resSendB = await sendMessage(
      withSession(`${BASE}/conversations/${id}/messages`, b.token, {
        method: "POST",
        body: JSON.stringify({ query: "Tin nhắn lén từ bên ngoài" }),
      }),
      { params: Promise.resolve({ id }) }
    )
    expect(resSendB.status).toBe(404)
  })

  it("GET /chat/conversations chỉ trả về hội thoại thuộc tổ chức của mình", async () => {
    await createConversation(
      withSession(`${BASE}/conversations`, a.token, {
        method: "POST",
        body: JSON.stringify({ title: "Hội thoại A1" }),
      })
    )
    await createConversation(
      withSession(`${BASE}/conversations`, a.token, {
        method: "POST",
        body: JSON.stringify({ title: "Hội thoại A2" }),
      })
    )
    await createConversation(
      withSession(`${BASE}/conversations`, b.token, {
        method: "POST",
        body: JSON.stringify({ title: "Hội thoại B1" }),
      })
    )

    const resListA = await listConversations(withSession(`${BASE}/conversations`, a.token))
    const dataA = (await readJson(resListA)) as { items: Array<{ title: string }> }
    expect(dataA.items.length).toBe(2)

    const resListB = await listConversations(withSession(`${BASE}/conversations`, b.token))
    const dataB = (await readJson(resListB)) as { items: Array<{ title: string }> }
    expect(dataB.items.length).toBe(1)
    expect(dataB.items[0]?.title).toBe("Hội thoại B1")
  })
})
