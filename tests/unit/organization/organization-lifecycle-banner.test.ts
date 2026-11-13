import { describe, expect, it } from "vitest"

import { canEnterOrganization, lifecycleBanner, lifecycleBlockedMessage } from "@/modules/organization/domain/organization-lifecycle"

/** Audit User Journey UJ-26 / UJ-27: người dùng thấy rõ tổ chức đang tạm ngưng hay chỉ xem, câu không lộ mã. */
describe("lifecycleBanner", () => {
  it("đang hoạt động / không rõ → không có banner", () => {
    expect(lifecycleBanner("ACTIVE")).toBeNull()
    expect(lifecycleBanner(undefined)).toBeNull()
    expect(lifecycleBanner("LẠ")).toBeNull()
  })

  it("tạm ngưng / đã đóng → banner đỏ; rời nền tảng → banner vàng 'chỉ xem'; câu trùng câu lỗi của máy chủ", () => {
    expect(lifecycleBanner("SUSPENDED")).toEqual({ tone: "danger", message: lifecycleBlockedMessage("SUSPENDED") })
    expect(lifecycleBanner("DELETED")).toEqual({ tone: "danger", message: lifecycleBlockedMessage("DELETED") })
    expect(lifecycleBanner("OFFBOARDING")).toEqual({ tone: "warning", message: lifecycleBlockedMessage("OFFBOARDING") })
    for (const s of ["SUSPENDED", "DELETED", "OFFBOARDING"]) expect(lifecycleBanner(s)?.message).not.toMatch(/[A-Z_]{4,}/)
  })
})

describe("canEnterOrganization", () => {
  it("vào được tổ chức hoạt động / rời nền tảng (chỉ xem); không vào được tổ chức tạm ngưng / đã đóng", () => {
    expect(canEnterOrganization("ACTIVE")).toBe(true)
    expect(canEnterOrganization("OFFBOARDING")).toBe(true)
    expect(canEnterOrganization("SUSPENDED")).toBe(false)
    expect(canEnterOrganization("DELETED")).toBe(false)
  })
})
