import { beforeEach, describe, expect, it, vi } from "vitest"

/**
 * Audit API §15/§29 (11/11/2026): ba route danh sách cũ đưa thẳng `Number()`/`parseInt()` của `?limit=`/`?page=`
 * xuống Prisma — chữ thành `NaN` → 500. Nay sai dạng hoặc ngoài khoảng → 400 và không chạm truy vấn.
 */
const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["T1", "U3"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({
  requireTenantContext: async () => ({ ctx, resolved: { user: { id: "u" } } }),
}))

const listUserInbox = vi.fn(async () => ({ items: [], total: 0, unreadCount: 0 }))
vi.mock("@/modules/notification/use-cases/manage-inbox", () => ({ listUserInbox: (...a: unknown[]) => listUserInbox(...(a as [])) }))
const listConversations = vi.fn(async () => [])
vi.mock("@/modules/chat-assistant/use-cases/list-conversations", () => ({ listConversations: (...a: unknown[]) => listConversations(...(a as [])) }))
vi.mock("@/modules/chat-assistant/use-cases/create-conversation", () => ({ createConversation: vi.fn() }))
const listReviewQueue = vi.fn(async () => [])
vi.mock("@/core/ai/infra/ai-request-repository", () => ({
  AiRequestRepository: class {
    listReviewQueue(...a: unknown[]) {
      return listReviewQueue(...(a as []))
    }
  },
}))
vi.mock("@/modules/ai-governance/use-cases/review-ai-request", () => ({ reviewAiRequest: vi.fn() }))

import { GET as inboxGET } from "@/app/api/v1/notification/inbox/route"
import { GET as conversationsGET } from "@/app/api/v1/chat/conversations/route"
import { GET as reviewGET } from "@/app/api/v1/ai-requests/review/route"

const req = (path: string) => new Request(`http://localhost/api/v1${path}`)

describe("GET /notification/inbox — page/limit", () => {
  beforeEach(() => listUserInbox.mockClear())

  it("mặc định page 1, limit 20; số hợp lệ đi xuống use-case và báo lại đúng", async () => {
    expect((await inboxGET(req("/notification/inbox"))).status).toBe(200)
    expect(listUserInbox).toHaveBeenLastCalledWith("u", "org-a", { page: 1, limit: 20, unreadOnly: false })
    const res = await inboxGET(req("/notification/inbox?page=3&limit=100"))
    expect((await res.json()).pagination).toMatchObject({ page: 3, limit: 100 })
  })

  it.each(["?limit=abc", "?limit=0", "?limit=101", "?page=abc", "?page=0", "?page=1.5"])("%s → 400", async (q) => {
    const res = await inboxGET(req(`/notification/inbox${q}`))
    expect(res.status).toBe(400)
    expect(listUserInbox).not.toHaveBeenCalled()
  })
})

describe("GET /chat/conversations — limit", () => {
  beforeEach(() => listConversations.mockClear())

  it("mặc định 50; giá trị hợp lệ giữ nguyên", async () => {
    await conversationsGET(req("/chat/conversations"))
    expect(listConversations).toHaveBeenLastCalledWith(ctx, "ACTIVE", 50)
    await conversationsGET(req("/chat/conversations?status=ACTIVE&limit=50"))
    expect(listConversations).toHaveBeenLastCalledWith(ctx, "ACTIVE", 50)
  })

  it.each(["abc", "0", "101", "-5"])("limit=%s → 400", async (limit) => {
    const res = await conversationsGET(req(`/chat/conversations?limit=${limit}`))
    expect(res.status).toBe(400)
    expect((await res.json()).error.details).toHaveProperty("limit")
    expect(listConversations).not.toHaveBeenCalled()
  })
})

describe("GET /ai-requests/review — limit", () => {
  beforeEach(() => listReviewQueue.mockClear())

  it("mặc định 100; tối đa 5.000 như trần của repository", async () => {
    await reviewGET(req("/ai-requests/review"))
    expect(listReviewQueue).toHaveBeenLastCalledWith(ctx, 100)
    await reviewGET(req("/ai-requests/review?limit=5000"))
    expect(listReviewQueue).toHaveBeenLastCalledWith(ctx, 5000)
  })

  it.each(["abc", "0", "-1", "5001"])("limit=%s → 400", async (limit) => {
    const res = await reviewGET(req(`/ai-requests/review?limit=${limit}`))
    expect(res.status).toBe(400)
    expect(listReviewQueue).not.toHaveBeenCalled()
  })
})
