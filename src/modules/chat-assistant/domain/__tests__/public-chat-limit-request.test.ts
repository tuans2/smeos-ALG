import { describe, expect, it } from "vitest"
import {
  canRequestLimits,
  isAllowedLimitTier,
  readPendingLimitRequest,
} from "../public-chat-limit-request"
import { DEFAULT_PUBLIC_CHAT_LIMITS } from "../public-chat-policy"

describe("yêu cầu nâng hạn mức chat công khai", () => {
  it("chỉ nhận các mức chọn sẵn", () => {
    expect(isAllowedLimitTier(50, 150)).toBe(true)
    expect(isAllowedLimitTier(200, 600)).toBe(true)
    expect(isAllowedLimitTier(999, 999)).toBe(false)
    expect(isAllowedLimitTier(50, 600)).toBe(false)
  })

  it("mức xin phải cao hơn mức đang áp dụng", () => {
    expect(canRequestLimits(DEFAULT_PUBLIC_CHAT_LIMITS, 50, 150)).toBe(true)
    const at100 = { perVisitor: 100, perIp: 300, windowMs: 600_000 }
    expect(canRequestLimits(at100, 50, 150)).toBe(false)
    expect(canRequestLimits(at100, 100, 300)).toBe(false)
    expect(canRequestLimits(at100, 200, 600)).toBe(true)
  })

  it("đọc yêu cầu chờ duyệt từ settings, bỏ qua dữ liệu hỏng", () => {
    const pending = { per_visitor: 50, per_ip: 150, requested_at: "2026-10-31T00:00:00Z", requested_by: "u1", note: null }
    expect(readPendingLimitRequest({ pending_public_chat_limits: pending })).toEqual(pending)
    expect(readPendingLimitRequest({})).toBeNull()
    expect(readPendingLimitRequest(null)).toBeNull()
    expect(readPendingLimitRequest({ pending_public_chat_limits: { per_visitor: "50" } })).toBeNull()
  })
})
