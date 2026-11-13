import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/core/ai/gateway", () => ({ callCapability: vi.fn() }))
vi.mock("@/core/ai/wiring", () => ({ aiGatewayDeps: () => ({}) }))
vi.mock("@/core/ai/adapters/multi-llm-provider", () => ({ createContentLLM: () => ({}) }))

import { loadImageForAi } from "../run-photo-match"

/** Ảnh đưa AI đối chiếu có thể do tiệm nhập URL — máy chủ không được tự tải địa chỉ nội bộ (rà soát cụm H). */
describe("loadImageForAi", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("không tải http, địa chỉ nội bộ, metadata đám mây; không theo chuyển hướng", async () => {
    const fetchSpy = vi.fn(async () => new Response(new Uint8Array([1, 2]), { headers: { "content-type": "image/png" } }))
    vi.stubGlobal("fetch", fetchSpy)
    for (const url of ["http://cdn.example.com/a.jpg", "https://169.254.169.254/latest/meta-data", "https://localhost/a.png", "https://10.0.0.5/a.png"]) {
      expect(await loadImageForAi(url), url).toBeNull()
    }
    expect(fetchSpy).not.toHaveBeenCalled()

    expect(await loadImageForAi("https://cdn.example.com/a.png")).toEqual({ mimeType: "image/png", base64: "AQI=" })
    expect(fetchSpy).toHaveBeenCalledWith("https://cdn.example.com/a.png", expect.objectContaining({ redirect: "error" }))
  })

  it("bỏ ảnh quá 8 MB và nội dung không phải ảnh; vẫn nhận data URI", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("x", { headers: { "content-type": "image/jpeg", "content-length": String(9 * 1024 * 1024) } })))
    expect(await loadImageForAi("https://cdn.example.com/big.jpg")).toBeNull()
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { headers: { "content-type": "text/html" } })))
    expect(await loadImageForAi("https://cdn.example.com/page")).toBeNull()
    expect(await loadImageForAi("data:image/jpeg;base64,AAAA")).toEqual({ mimeType: "image/jpeg", base64: "AAAA" })
  })
})
