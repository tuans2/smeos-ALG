import { describe, expect, it } from "vitest"

import { canResolve, dsrDueAt } from "./data-subject-request"

describe("yêu cầu của khách về dữ liệu cá nhân", () => {
  it("hạn xử lý 72 giờ từ lúc tiếp nhận", () => {
    expect(dsrDueAt(new Date("2026-11-12T01:00:00Z")).toISOString()).toBe("2026-11-15T01:00:00.000Z")
  })

  it("chỉ đóng được yêu cầu đang chờ, thành hoàn tất hoặc từ chối", () => {
    expect(canResolve("RECEIVED", "COMPLETED")).toBe(true)
    expect(canResolve("RECEIVED", "REJECTED")).toBe(true)
    expect(canResolve("RECEIVED", "RECEIVED")).toBe(false)
    expect(canResolve("COMPLETED", "REJECTED")).toBe(false)
  })
})
