import { describe, expect, it } from "vitest"

import { checkPartnershipTransition, isPartnershipInviteExpired } from "../partnership-lifecycle"

describe("vòng đời liên kết Chuỗi ↔ cửa hàng (UJ-10)", () => {
  it("chỉ cửa hàng chấp nhận lời mời; Chuỗi không tự kích hoạt", () => {
    expect(checkPartnershipTransition("PENDING", "ACTIVE", "STORE").ok).toBe(true)
    expect(checkPartnershipTransition("PENDING", "ACTIVE", "CHAIN").ok).toBe(false)
  })

  it("Chuỗi tạm ngưng / mở lại / chấm dứt; cửa hàng tự rời được", () => {
    expect(checkPartnershipTransition("ACTIVE", "SUSPENDED", "CHAIN").ok).toBe(true)
    expect(checkPartnershipTransition("SUSPENDED", "ACTIVE", "CHAIN").ok).toBe(true)
    expect(checkPartnershipTransition("ACTIVE", "TERMINATED", "STORE").ok).toBe(true)
    expect(checkPartnershipTransition("ACTIVE", "SUSPENDED", "STORE").ok).toBe(false)
  })

  it("đã chấm dứt là kết thúc, thông điệp tiếng Việt không lộ mã", () => {
    const r = checkPartnershipTransition("TERMINATED", "ACTIVE", "CHAIN")
    expect(r.ok).toBe(false)
    expect(r.ok ? "" : r.reason).not.toMatch(/[A-Z_]{4,}/)
  })

  it("lời mời quá 7 ngày hết hạn", () => {
    const now = new Date("2026-11-20T00:00:00Z")
    expect(isPartnershipInviteExpired(new Date("2026-11-12T00:00:00Z"), now)).toBe(true)
    expect(isPartnershipInviteExpired(new Date("2026-11-14T00:00:00Z"), now)).toBe(false)
  })
})
