import { beforeEach, describe, expect, it, vi } from "vitest"

import { quotaExceeded } from "@/core/http/errors"

/** PO 07/11/2026 (audit API-02, nợ #170): rewrite gác một trong F2/L2/L3, giữ 1 credit, hoàn khi không có gợi ý AI. */
const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u-1", branchId: null, capabilities: new Set<string>(["L2"]) }
let current = ctx
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx: current }) }))
const callCapability = vi.fn()
vi.mock("@/core/ai/gateway", () => ({ callCapability: () => callCapability() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: () => ({}) }))
vi.mock("@/modules/profiles/use-cases/get-brand-profile", () => ({ getBrandProfile: async () => null }))
vi.mock("@/modules/profiles/use-cases/get-business-profile", () => ({ getBusinessProfile: async () => null }))
const release = vi.fn(async () => undefined)
const hold = vi.fn(async () => ({ cost: 1, release }))
vi.mock("@/modules/content-engine/use-cases/rewrite-credit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/content-engine/use-cases/rewrite-credit")>()),
  holdRewriteCredit: () => hold(),
}))

import { resetRateLimits } from "@/core/http/rate-limit"
import { POST } from "@/app/api/v1/content-engine/rewrite/route"

const post = () =>
  POST(new Request("http://localhost/api/v1/content-engine/rewrite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Tặng thiệp viết tay" }),
  }))

describe("POST /api/v1/content-engine/rewrite — quyền và credit", () => {
  beforeEach(() => {
    resetRateLimits()
    callCapability.mockReset()
    hold.mockClear()
    release.mockClear()
    current = ctx
  })

  it("không có F2/L2/L3 → 403, không giữ credit, không gọi AI", async () => {
    current = { ...ctx, capabilities: new Set(["L1", "R2"]) }
    const res = await post()
    expect(res.status).toBe(403)
    expect(hold).not.toHaveBeenCalled()
    expect(callCapability).not.toHaveBeenCalled()
  })

  it.each(["F2", "L2", "L3"])("có %s → dùng được", async (code) => {
    current = { ...ctx, capabilities: new Set([code]) }
    callCapability.mockResolvedValue({ kind: "xong", output: { suggestions: ["a", "b", "c"] } })
    expect((await post()).status).toBe(200)
  })

  it("AI trả gợi ý → giữ credit, không hoàn", async () => {
    callCapability.mockResolvedValue({ kind: "xong", output: { suggestions: ["a", "b", "c"] } })
    const body = await (await post()).json()
    expect(body.suggestions).toEqual(["a", "b", "c"])
    expect(body.fallback).toBeUndefined()
    expect(hold).toHaveBeenCalledTimes(1)
    expect(release).not.toHaveBeenCalled()
  })

  it("AI trả không đọc được → gợi ý dựng sẵn, hoàn credit", async () => {
    callCapability.mockResolvedValue({ kind: "xong", output: { suggestions: ["x"], fallback: true } })
    const body = await (await post()).json()
    expect(body.fallback).toBe(true)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it("cổng AI không chạy được → gợi ý dựng sẵn, hoàn credit", async () => {
    callCapability.mockResolvedValue({ kind: "loi", reason: "no_model" })
    const body = await (await post()).json()
    expect(body.fallback).toBe(true)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it("cổng AI ném lỗi → hoàn credit rồi trả lỗi", async () => {
    callCapability.mockRejectedValue(new Error("hỏng"))
    expect((await post()).status).toBe(500)
    expect(release).toHaveBeenCalledTimes(1)
  })

  it("hết credit → 422 QUOTA_EXCEEDED, không gọi AI", async () => {
    hold.mockRejectedValueOnce(quotaExceeded("Không đủ credit", { required: 1 }))
    const res = await post()
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe("QUOTA_EXCEEDED")
    expect(callCapability).not.toHaveBeenCalled()
  })
})
