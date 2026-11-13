import { describe, expect, it } from "vitest"

import { isSupersededResponse } from "../session-ended"

describe("trang đăng nhập nhận ra phiên bị thay ở thiết bị khác (checklist ALG 1.2)", () => {
  it("401 kèm lý do SESSION_SUPERSEDED → hiện câu báo", () => {
    expect(isSupersededResponse(401, { error: { code: "UNAUTHENTICATED", details: { reason: "SESSION_SUPERSEDED" } } })).toBe(true)
  })

  it("chưa đăng nhập, tự đăng xuất, phiên còn sống hay lỗi mạng → không báo", () => {
    expect(isSupersededResponse(401, { error: { code: "UNAUTHENTICATED" } })).toBe(false)
    expect(isSupersededResponse(200, { data: { active: true } })).toBe(false)
    expect(isSupersededResponse(401, null)).toBe(false)
    expect(isSupersededResponse(500, { error: { details: { reason: "SESSION_SUPERSEDED" } } })).toBe(false)
  })
})
