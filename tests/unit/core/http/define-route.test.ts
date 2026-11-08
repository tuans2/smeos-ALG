import type { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { AppError } from "@/core/http/errors"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u-1", branchId: null, capabilities: new Set(["L1"]) }
let currentCtx = ctx
const requireTenantContext = vi.fn(async () => ({ ctx: currentCtx }))
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: () => requireTenantContext() }))
vi.mock("@/modules/platform/use-cases/resolve-platform-session", () => ({
  requirePlatformContext: async () => ({ userId: "op-1", capabilities: new Set(["N1"]) }),
}))
vi.mock("@/modules/integration/use-cases/resolve-integration-context", () => ({
  requireIntegrationContext: async () => ({ source: "token", organizationId: "org-a", client: "LocalBudd", tokenId: "t" }),
}))

import { assertSnakeCaseKeys, defineRoute } from "@/core/http/define-route"
import { ok } from "@/core/http/contract-responses"
import { pageQuery } from "@/core/http/pagination"
import { resetRateLimits } from "@/core/http/rate-limit"

/** Chuẩn API Contract v1.1 (PO chốt 07/11/2026): một khai báo cho xác thực, quyền, tần suất, lược đồ. */
function req(url: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost/api/v1${url}`, init)
}
const postJson = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  req(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) })

describe("defineRoute", () => {
  beforeEach(() => {
    resetRateLimits()
    requireTenantContext.mockClear()
    currentCtx = ctx
  })

  it("tenant: gọi handler với ctx, query đã parse (limit mặc định 25) và params", async () => {
    const GET = defineRoute({
      auth: { kind: "tenant", capability: "L1" },
      query: z.object({ ...pageQuery, status: z.string().optional() }),
      handler: async ({ ctx: c, query, params }) => ok({ org: c.organizationId, query, params }),
    })
    const res = await GET(req("/price-lists/p-1?status=ACTIVE"), { params: Promise.resolve({ id: "p-1" }) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ data: { org: "org-a", query: { limit: 25, status: "ACTIVE" }, params: { id: "p-1" } } })
  })

  it("tenant: thiếu mã năng lực → 403, không chạy handler", async () => {
    const handler = vi.fn(async () => ok(null))
    const GET = defineRoute({ auth: { kind: "tenant", capability: "Z9" }, handler })
    const res = await GET(req("/x"))
    expect(res.status).toBe(403)
    expect(handler).not.toHaveBeenCalled()
  })

  it("query sai → 400 details.issues, câu tiếng Việt", async () => {
    const GET = defineRoute({ auth: { kind: "tenant", capability: "L1" }, query: z.object(pageQuery), handler: async () => ok(null) })
    for (const limit of ["0", "101", "abc"]) {
      const res = await GET(req(`/x?limit=${limit}`))
      expect(res.status).toBe(400)
      const issue = (await res.json()).error.details.issues[0]
      expect(issue.path).toEqual(["limit"])
      expect(issue.message).toBe("Phải là số nguyên từ 1 đến 100")
    }
  })

  it("body: sai lược đồ hoặc JSON hỏng → 400", async () => {
    const POST = defineRoute({
      auth: { kind: "tenant", capability: "L1" },
      body: z.object({ display_name: z.string().min(1) }),
      handler: async ({ body }) => ok(body),
    })
    expect((await POST(postJson("/x", { display_name: "" }))).status).toBe(400)
    expect((await POST(req("/x", { method: "POST", body: "{hong" }))).status).toBe(400)
    expect(await (await POST(postJson("/x", { display_name: "Lan" }))).json()).toEqual({ data: { display_name: "Lan" } })
  })

  it("idempotency: required → thiếu header là 400; có header thì handler nhận khoá", async () => {
    const POST = defineRoute({
      auth: { kind: "tenant", capability: "L1" },
      idempotency: "required",
      handler: async ({ idempotencyKey }) => ok({ idempotencyKey }),
    })
    const missing = await POST(postJson("/x", {}))
    expect(missing.status).toBe(400)
    expect((await missing.json()).error.details).toHaveProperty("idempotency-key")
    expect(await (await POST(postJson("/x", {}, { "idempotency-key": "k-1" }))).json()).toEqual({ data: { idempotencyKey: "k-1" } })
  })

  it("public: chặn tần suất theo IP trước khi làm gì khác", async () => {
    const handler = vi.fn(async () => ok(null))
    const POST = defineRoute({ auth: { kind: "public" }, rateLimit: { scope: "thu-public", limit: 1, windowMs: 60_000, per: "ip" }, handler })
    expect((await POST(postJson("/public/x", {}))).status).toBe(200)
    const res = await POST(postJson("/public/x", {}))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).not.toBeNull()
    expect(handler).toHaveBeenCalledTimes(1)
    expect(requireTenantContext).not.toHaveBeenCalled()
  })

  it("rateLimit per user: mỗi người dùng một trần", async () => {
    const GET = defineRoute({
      auth: { kind: "tenant", capability: "L1" },
      rateLimit: { scope: "thu-user", limit: 1, windowMs: 60_000, per: "user" },
      handler: async () => ok(null),
    })
    expect((await GET(req("/x"))).status).toBe(200)
    expect((await GET(req("/x"))).status).toBe(429)
    currentCtx = { ...ctx, userId: "u-2" }
    expect((await GET(req("/x"))).status).toBe(200)
  })

  it("cron: thiếu CRON_SECRET hợp lệ → 401", async () => {
    const POST = defineRoute({ auth: { kind: "cron" }, handler: async () => ok(null) })
    expect((await POST(req("/internal/x", { method: "POST" }))).status).toBe(401)
  })

  it("platform: kiểm mã năng lực nền tảng", async () => {
    const allowed = defineRoute({ auth: { kind: "platform", capability: "N1" }, handler: async ({ pctx }) => ok(pctx.userId) })
    const denied = defineRoute({ auth: { kind: "platform", capability: "N12" }, handler: async () => ok(null) })
    expect(await (await allowed(req("/platform/x"))).json()).toEqual({ data: "op-1" })
    expect((await denied(req("/platform/x"))).status).toBe(403)
  })

  it("trường camelCase ở thân/query → ném ngay lúc khai báo, kể cả lồng trong mảng/optional", () => {
    expect(() =>
      defineRoute({ auth: { kind: "tenant", capability: "L1" }, body: z.object({ productId: z.string() }), handler: async () => ok(null) })
    ).toThrow(/body\.productId.*snake_case/)
    expect(() => assertSnakeCaseKeys(z.object({ items: z.array(z.object({ unitPrice: z.number() })).optional() }), "body")).toThrow(
      /body\.items\.unitPrice/
    )
    expect(() => assertSnakeCaseKeys(z.object({ items: z.array(z.object({ unit_price_vnd: z.number() })) }), "body")).not.toThrow()
  })

  it("lỗi nghiệp vụ trong handler vẫn theo envelope chung", async () => {
    const GET = defineRoute({
      auth: { kind: "tenant", capability: "L1" },
      handler: async () => {
        throw new AppError("CONFLICT", "Đã duyệt rồi")
      },
    })
    const res = await GET(req("/x"))
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: { code: "CONFLICT", message: "Đã duyệt rồi" } })
  })
})

// Kiểm lúc biên dịch: export của route phải khớp chữ ký route handler Next 16 (tĩnh và động).
type NextHandler<P> = (request: NextRequest, context: { params: Promise<P> }) => Promise<Response>
export const staticRoute: NextHandler<Record<string, never>> = defineRoute({ auth: { kind: "tenant", capability: "L1" }, handler: async () => ok(null) })
export const dynamicRoute: NextHandler<{ id: string }> = defineRoute<{ kind: "tenant"; capability: string }, undefined, undefined, { id: string }>({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ params }) => ok(params.id),
})
