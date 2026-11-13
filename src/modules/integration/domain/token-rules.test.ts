import { describe, expect, it } from "vitest"

import {
  DEFAULT_TOKEN_TTL_DAYS,
  MAX_TOKEN_TTL_DAYS,
  MIN_TOKEN_TTL_DAYS,
  isTokenActive,
  isValidTtlDays,
  resolveExpiry,
} from "./token-rules"

describe("token-rules — P7 (YC-T8)", () => {
  it("resolveExpiry mặc định 90 ngày khi không truyền ttlDays", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    const expiry = resolveExpiry(now, undefined)
    const expectedDays = (expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    expect(expectedDays).toBe(DEFAULT_TOKEN_TTL_DAYS)
  })

  it("resolveExpiry chấp nhận ttlDays hợp lệ trong biên", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    expect(() => resolveExpiry(now, MIN_TOKEN_TTL_DAYS)).not.toThrow()
    expect(() => resolveExpiry(now, MAX_TOKEN_TTL_DAYS)).not.toThrow()
  })

  it("resolveExpiry từ chối ttlDays ngoài biên hoặc không nguyên", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    expect(() => resolveExpiry(now, 0)).toThrow(RangeError)
    expect(() => resolveExpiry(now, MAX_TOKEN_TTL_DAYS + 1)).toThrow(RangeError)
    expect(() => resolveExpiry(now, 1.5)).toThrow(RangeError)
  })

  it("isValidTtlDays đúng ba trường hợp biên", () => {
    expect(isValidTtlDays(MIN_TOKEN_TTL_DAYS)).toBe(true)
    expect(isValidTtlDays(MAX_TOKEN_TTL_DAYS)).toBe(true)
    expect(isValidTtlDays(0)).toBe(false)
    expect(isValidTtlDays(MAX_TOKEN_TTL_DAYS + 1)).toBe(false)
  })

  it("isTokenActive: false khi đã thu hồi, dù chưa hết hạn", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    const token = { revoked_at: new Date("2026-09-01T00:00:00.000Z"), expires_at: new Date("2026-12-01T00:00:00.000Z") }
    expect(isTokenActive(token, now)).toBe(false)
  })

  it("isTokenActive: false khi đã hết hạn, dù chưa bị thu hồi", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    const token = { revoked_at: null, expires_at: new Date("2026-09-01T00:00:00.000Z") }
    expect(isTokenActive(token, now)).toBe(false)
  })

  it("isTokenActive: true khi chưa thu hồi và chưa hết hạn", () => {
    const now = new Date("2026-09-10T00:00:00.000Z")
    const token = { revoked_at: null, expires_at: new Date("2026-12-01T00:00:00.000Z") }
    expect(isTokenActive(token, now)).toBe(true)
  })
})
