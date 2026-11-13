import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { clientIp, enforceRateLimit, resetRateLimits } from "@/core/http/rate-limit"
import { closeRedis } from "@/core/cache/redis-client"

function req(ip: string): Request {
  return new Request("http://x/", { headers: { "x-forwarded-for": `9.9.9.9, ${ip}` } })
}

const rule = { scope: `test-${Date.now()}`, limit: 3, windowMs: 60_000 }

describe("enforceRateLimit", () => {
  beforeEach(() => resetRateLimits())
  afterAll(async () => {
    await closeRedis()
  })

  it("cho qua đúng `limit` lượt rồi trả 429 RATE_LIMITED", async () => {
    const now = 1_000_000
    for (let i = 0; i < 3; i++) await enforceRateLimit(req("1.1.1.1"), rule, now)
    await expect(enforceRateLimit(req("1.1.1.1"), rule, now)).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })

  it("đếm riêng theo IP và mở lại ở cửa sổ kế tiếp", async () => {
    const now = 2_000_000_000
    for (let i = 0; i < 3; i++) await enforceRateLimit(req("2.2.2.2"), rule, now)
    await expect(enforceRateLimit(req("3.3.3.3"), rule, now)).resolves.toBeUndefined()
    await expect(enforceRateLimit(req("2.2.2.2"), rule, now + rule.windowMs)).resolves.toBeUndefined()
  })

  it("lấy IP do proxy nối vào (phải cùng), không tin phần tử client tự gửi", () => {
    const r = new Request("http://x/", { headers: { "x-forwarded-for": "6.6.6.6, 7.7.7.7" } })
    expect(clientIp(r)).toBe("7.7.7.7")
    expect(clientIp(r, 2)).toBe("6.6.6.6")
    expect(clientIp(r, 9)).toBe("6.6.6.6")
    expect(clientIp(new Request("http://x/", { headers: { "x-real-ip": "8.8.8.8" } }))).toBe("8.8.8.8")
  })

  it("key global: đổi IP (kể cả giả x-forwarded-for) vẫn chung một bộ đếm", async () => {
    const g = { scope: `test-global-${Date.now()}`, limit: 2, windowMs: 60_000, key: "global" as const }
    const now = 3_000_000
    await enforceRateLimit(req("4.4.4.4"), g, now)
    await enforceRateLimit(req("5.5.5.5"), g, now)
    await expect(enforceRateLimit(req("6.6.6.6"), g, now)).rejects.toMatchObject({ code: "RATE_LIMITED" })
  })
})
