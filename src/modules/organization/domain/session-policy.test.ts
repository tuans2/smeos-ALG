import { describe, expect, it } from "vitest"

import { expiresAt, isUsable, SESSION_TTL_MS } from "./session-policy"

const now = new Date("2026-09-09T00:00:00.000Z")

describe("luật phiên", () => {
  it("hạn dùng tính từ thời điểm tạo", () => {
    expect(expiresAt(now).getTime()).toBe(now.getTime() + SESSION_TTL_MS)
  })

  it("phiên còn hạn và chưa thu hồi thì dùng được", () => {
    expect(isUsable({ expires_at: expiresAt(now), revoked_at: null }, now)).toBe(true)
  })

  it("phiên hết hạn thì không dùng được", () => {
    const expired = new Date(now.getTime() - 1)
    expect(isUsable({ expires_at: expired, revoked_at: null }, now)).toBe(false)
  })

  it("phiên đã thu hồi thì không dùng được dù còn hạn", () => {
    expect(isUsable({ expires_at: expiresAt(now), revoked_at: now }, now)).toBe(false)
  })
})
