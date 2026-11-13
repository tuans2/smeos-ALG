import { describe, expect, it, vi } from "vitest"

vi.mock("@/core/http/rate-limit", () => ({ enforceRateLimit: vi.fn(async () => undefined) }))
vi.mock("@/modules/greeting-card/use-cases/share-links", () => ({
  openShareLink: vi.fn(async () => ({ sendCode: "SL-ABC123", sessionId: "s1", organizationId: "o1" })),
}))
vi.mock("@/modules/greeting-card/use-cases/brochure-owner", async () => {
  const { OWNER_COOKIE_MAX_AGE, ownerCookieName } = await import("@/modules/greeting-card/domain/session-owner")
  return {
    grantBrochureOwner: vi.fn(async (s: { send_code: string }) => ({ name: ownerCookieName(s.send_code), value: "chuky", maxAge: OWNER_COOKIE_MAX_AGE })),
    serializeOwnerCookie: (c: { name: string; value: string }, secure: boolean) => `${c.name}=${c.value}; Path=/; HttpOnly${secure ? "; Secure" : ""}`,
  }
})

const { GET } = await import("@/app/s/[code]/mo/route")

/**
 * Sau proxy của Render, `request.url` là địa chỉ nội bộ (localhost:3100). Link bộ sưu tập từng chuyển
 * khách sang https://localhost:3100/b/... (ERR_SSL_PROTOCOL_ERROR) — chuyển hướng phải là đường dẫn tương đối.
 */
describe("GET /s/<mã>/mo — chuyển sang trang Thẻ chào", () => {
  it("không lộ địa chỉ nội bộ: Location tương đối, cookie secure theo x-forwarded-proto", async () => {
    const req = new Request("http://localhost:3100/s/abc/mo", { headers: { "x-forwarded-proto": "https" } })
    const res = await GET(req, { params: Promise.resolve({ code: "abc" }) })
    expect(res.status).toBe(302)
    expect(res.headers.get("location")).toBe("/b/SL-ABC123?moi=1")
    expect(res.headers.get("set-cookie")).toMatch(/fl_s_ABC=SL-ABC123.*Secure/i)
    // Trình duyệt mở link chia sẻ là chủ phiên vừa tạo: người khác mở /b/SL-ABC123 không thấy phiên này
    expect(res.headers.get("set-cookie")).toMatch(/fl_b_SL-ABC123=chuky.*Secure/i)
  })
})
