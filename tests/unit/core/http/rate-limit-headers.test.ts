import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { enforceRateLimit, resetRateLimits } from "@/core/http/rate-limit"
import { handle } from "@/core/http/response"

/**
 * Audit API-08 (07/11/2026): đặc tả 06 §2 hứa 429 "kèm `Retry-After`" nhưng mã không đặt header nào;
 * client (vd. nhập ảnh Drive thử lại 4 lần) phải đoán thời gian chờ.
 */
const WINDOW_MS = 60_000
const get = () => new Request("http://localhost/api/v1/thu")

describe("handle() — header giới hạn tần suất", () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useFakeTimers()
    // 15 giây sau đầu một cửa sổ 60 giây → còn 45 giây
    vi.setSystemTime(new Date(Math.floor(Date.UTC(2026, 10, 7) / WINDOW_MS) * WINDOW_MS + 15_000))
  })
  afterEach(() => vi.useRealTimers())

  const limited = handle(async (request) => {
    await enforceRateLimit(request, { scope: "thu-header", limit: 2, windowMs: WINDOW_MS })
    return Response.json({ ok: true })
  })

  it("phản hồi thành công kèm RateLimit-Limit/Remaining/Reset", async () => {
    const res = await limited(get())
    expect(res.status).toBe(200)
    expect(res.headers.get("ratelimit-limit")).toBe("2")
    expect(res.headers.get("ratelimit-remaining")).toBe("1")
    expect(res.headers.get("ratelimit-reset")).toBe("45")
    expect(res.headers.get("retry-after")).toBeNull()
  })

  it("429 kèm Retry-After bằng số giây tới cuối cửa sổ", async () => {
    await limited(get())
    expect((await limited(get())).headers.get("ratelimit-remaining")).toBe("0")
    const res = await limited(get())
    expect(res.status).toBe(429)
    expect((await res.json()).error.code).toBe("RATE_LIMITED")
    expect(res.headers.get("retry-after")).toBe("45")
    expect(res.headers.get("ratelimit-remaining")).toBe("0")
  })

  it("nhiều luật trong một request → báo luật còn ít lượt nhất", async () => {
    const two = handle(async (request) => {
      await enforceRateLimit(request, { scope: "thu-rong", limit: 100, windowMs: WINDOW_MS })
      await enforceRateLimit(request, { scope: "thu-hep", limit: 3, windowMs: WINDOW_MS })
      return Response.json({ ok: true })
    })
    const res = await two(get())
    expect(res.headers.get("ratelimit-limit")).toBe("3")
    expect(res.headers.get("ratelimit-remaining")).toBe("2")
  })

  it("route không giới hạn tần suất thì không có header", async () => {
    const plain = handle(async () => Response.json({ ok: true }))
    const res = await plain(get())
    expect(res.headers.get("ratelimit-limit")).toBeNull()
  })

  it("ngữ cảnh request tách riêng: lượt đếm của request này không rò sang request khác", async () => {
    const plain = handle(async () => Response.json({ ok: true }))
    await limited(get())
    expect((await plain(get())).headers.get("ratelimit-limit")).toBeNull()
  })
})
