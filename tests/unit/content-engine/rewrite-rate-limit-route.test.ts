import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u-1", branchId: null, capabilities: new Set<string>(["L3"]) }
let current = ctx
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx: current }) }))
const callCapability = vi.fn(async () => ({ kind: "xong", output: { suggestions: ["a", "b", "c"] } }))
vi.mock("@/core/ai/gateway", () => ({ callCapability: () => callCapability() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: () => ({}) }))
vi.mock("@/modules/profiles/use-cases/get-brand-profile", () => ({ getBrandProfile: async () => null }))
vi.mock("@/modules/profiles/use-cases/get-business-profile", () => ({ getBusinessProfile: async () => null }))
// Credit kiểm riêng ở `rewrite-credit-route.test.ts` — ở đây chỉ đo trần tần suất
vi.mock("@/modules/content-engine/use-cases/rewrite-credit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/content-engine/use-cases/rewrite-credit")>()),
  holdRewriteCredit: async () => ({ cost: 1, release: async () => undefined }),
}))

import { resetRateLimits } from "@/core/http/rate-limit"
import { POST } from "@/app/api/v1/content-engine/rewrite/route"

const post = () =>
  POST(new Request("http://localhost/api/v1/content-engine/rewrite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Tặng thiệp viết tay" }),
  }))

/** Audit API-02 (06/11/2026): mỗi lượt là một lời gọi LLM đồng bộ, chưa gác mã năng lực/chưa trừ credit (nợ #170). */
describe("POST /api/v1/content-engine/rewrite — giới hạn tần suất", () => {
  beforeEach(() => {
    resetRateLimits()
    callCapability.mockClear()
    current = ctx
  })

  it("30 lượt/10 phút mỗi người dùng; lượt 31 → 429 và không gọi AI", async () => {
    for (let i = 0; i < 30; i++) expect((await post()).status).toBe(200)
    const res = await post()
    expect(res.status).toBe(429)
    expect((await res.json()).error.code).toBe("RATE_LIMITED")
    expect(callCapability).toHaveBeenCalledTimes(30)
  })

  it("trần riêng từng người: người khác cùng tổ chức vẫn gọi được", async () => {
    for (let i = 0; i < 30; i++) await post()
    current = { ...ctx, userId: "u-2" }
    expect((await post()).status).toBe(200)
  })

  it("200 lượt/giờ mỗi tổ chức dù chia cho nhiều người", async () => {
    for (let i = 0; i < 200; i++) {
      current = { ...ctx, userId: `u-${i % 10}` }
      expect((await post()).status).toBe(200)
    }
    current = { ...ctx, userId: "u-moi" }
    expect((await post()).status).toBe(429)
  })
})
