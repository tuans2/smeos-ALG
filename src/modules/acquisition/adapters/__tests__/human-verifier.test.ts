import { describe, expect, it, vi } from "vitest"
import { createTurnstileVerifier, getHumanVerifier, honeypotOnlyVerifier } from "../human-verifier"

function fakeFetch(response: Response | Error) {
  return vi.fn(async () => {
    if (response instanceof Error) throw response
    return response
  }) as unknown as typeof fetch
}

describe("getHumanVerifier", () => {
  it("không khai khoá → chỉ ô bẫy (không gọi ra ngoài)", () => {
    expect(getHumanVerifier({}).name).toBe("honeypot")
    expect(getHumanVerifier({ TURNSTILE_SECRET_KEY: "  " }).name).toBe("honeypot")
  })
  it("có khoá → Turnstile", () => {
    expect(getHumanVerifier({ TURNSTILE_SECRET_KEY: "k" }).name).toBe("turnstile")
  })
  it("honeypot luôn cho qua", async () => {
    expect(await honeypotOnlyVerifier.verify({})).toBe(true)
  })
})

describe("Turnstile", () => {
  it("thiếu mã từ trình duyệt → từ chối, không gọi Cloudflare", async () => {
    const f = fakeFetch(new Response("{}"))
    expect(await createTurnstileVerifier("s", f).verify({})).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })
  it("Cloudflare trả success true/false", async () => {
    expect(await createTurnstileVerifier("s", fakeFetch(new Response(JSON.stringify({ success: true })))).verify({ token: "t" })).toBe(true)
    expect(await createTurnstileVerifier("s", fakeFetch(new Response(JSON.stringify({ success: false })))).verify({ token: "t" })).toBe(false)
  })
  it("Cloudflare lỗi mạng hoặc 5xx → cho qua (không mất khách)", async () => {
    expect(await createTurnstileVerifier("s", fakeFetch(new Error("network"))).verify({ token: "t" })).toBe(true)
    expect(await createTurnstileVerifier("s", fakeFetch(new Response("", { status: 503 }))).verify({ token: "t" })).toBe(true)
  })
  it("gửi secret + mã + IP dạng form", async () => {
    const f = fakeFetch(new Response(JSON.stringify({ success: true })))
    await createTurnstileVerifier("sec", f).verify({ token: "tok", remoteIp: "1.2.3.4" })
    const body = (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]![1].body as URLSearchParams
    expect(body.get("secret")).toBe("sec")
    expect(body.get("response")).toBe("tok")
    expect(body.get("remoteip")).toBe("1.2.3.4")
  })
})
