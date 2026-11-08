import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { holdRewriteCredit, type RewriteCreditDeps } from "../rewrite-credit"

const ctx = { organizationId: "org-1", workspaceId: "ws-1", userId: "u-1", capabilities: new Set<string>() } as unknown as TenantContext

function deps(kind: string | null = "PRODUCTION", ok = true): RewriteCreditDeps & { deduct: ReturnType<typeof vi.fn>; refund: ReturnType<typeof vi.fn> } {
  return { workspaceKind: async () => kind, deduct: vi.fn(async () => ok), refund: vi.fn(async () => undefined) }
}

describe("holdRewriteCredit — giá content.rewrite", () => {
  it("trừ 1 credit; hoàn đúng một lần dù gọi release nhiều lần", async () => {
    const d = deps()
    const held = await holdRewriteCredit(ctx, d)
    expect(held.cost).toBe(1)
    expect(d.deduct).toHaveBeenCalledWith(ctx, 1)
    await held.release()
    await held.release()
    expect(d.refund).toHaveBeenCalledTimes(1)
    expect(d.refund).toHaveBeenCalledWith(ctx, 1)
  })

  it("không đủ credit → QUOTA_EXCEEDED", async () => {
    await expect(holdRewriteCredit(ctx, deps("PRODUCTION", false))).rejects.toMatchObject({ code: "QUOTA_EXCEEDED" })
  })

  it("không gian trải nghiệm → không trừ", async () => {
    const d = deps("EXPERIENCE")
    const held = await holdRewriteCredit(ctx, d)
    expect(held.cost).toBe(0)
    await held.release()
    expect(d.deduct).not.toHaveBeenCalled()
    expect(d.refund).not.toHaveBeenCalled()
  })
})
