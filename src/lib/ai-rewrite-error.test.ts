import { afterEach, describe, expect, it, vi } from "vitest"

import { callContentEngineMarketing } from "@/components/products/ai-product-helpers"
import { REWRITE_NO_CREDIT, REWRITE_NO_PERMISSION, emptyUnlessRewriteBlocked, rewriteBlockedMessage } from "./ai-rewrite-error"

/** "Viết lại bằng AI" hết credit / thiếu quyền phải báo lý do, không bịa gợi ý, không im lặng (PO 07/11/2026). */
const errorRes = (status: number, code: string) =>
  new Response(JSON.stringify({ error: { code, message: "x" } }), { status, headers: { "content-type": "application/json" } })

describe("báo lỗi Viết lại bằng AI bị chặn", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("422 QUOTA_EXCEEDED → câu hết credit; 403 → câu thiếu quyền", async () => {
    expect(await rewriteBlockedMessage(errorRes(422, "QUOTA_EXCEEDED"))).toBe(REWRITE_NO_CREDIT)
    expect(await rewriteBlockedMessage(errorRes(403, "CAPABILITY_DENIED"))).toBe(REWRITE_NO_PERMISSION)
  })

  it("lỗi khác (422 khác mã, 429, 500) → null, nơi gọi giữ cách xử lý cũ", async () => {
    expect(await rewriteBlockedMessage(errorRes(422, "UNPROCESSABLE_ENTITY"))).toBeNull()
    expect(await rewriteBlockedMessage(errorRes(429, "RATE_LIMITED"))).toBeNull()
    expect(await rewriteBlockedMessage(new Response("hỏng", { status: 500 }))).toBeNull()
    await expect(emptyUnlessRewriteBlocked(errorRes(429, "RATE_LIMITED"))).resolves.toEqual([])
  })

  it("form sản phẩm: hết credit → ném lỗi kèm câu báo; thành công → gợi ý; lỗi mạng → rỗng", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => errorRes(422, "QUOTA_EXCEEDED")))
    await expect(callContentEngineMarketing("Bó hồng")).rejects.toThrow(REWRITE_NO_CREDIT)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ data: { suggestions: ["a", "b"] } }), { status: 200 })))
    expect(await callContentEngineMarketing("Bó hồng")).toEqual(["a", "b"])
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("mạng") }))
    expect(await callContentEngineMarketing("Bó hồng")).toEqual([])
  })
})
