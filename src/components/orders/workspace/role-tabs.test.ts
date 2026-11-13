import { describe, expect, it } from "vitest"

import { defaultWorkspaceTab, isWorkspaceTab, visibleWorkspaceTabs } from "./role-tabs"

const roleCan = (codes: string[]) => (code: string) => codes.includes(code)

describe("mục Đơn hàng — tab theo vai", () => {
  it("Điều hành (mọi mã) thấy đủ 5 tab, mở Phê duyệt", () => {
    const can = () => true
    expect(visibleWorkspaceTabs(can)).toEqual(["leads", "sale", "approve", "coordinate", "all"])
    expect(defaultWorkspaceTab(can)).toBe("approve")
  })

  it("Sale (Q1, R2, R15): không thấy Phê duyệt/Điều phối, mở Khách tiềm năng", () => {
    const can = roleCan(["Q1", "R1", "R2", "R15"])
    expect(visibleWorkspaceTabs(can)).toEqual(["leads", "sale", "all"])
    expect(defaultWorkspaceTab(can)).toBe("leads")
  })

  it("Điều phối (R4/R5, không R11/R16): mở Điều phối", () => {
    const can = roleCan(["Q1", "R1", "R2", "R4", "R5"])
    expect(visibleWorkspaceTabs(can)).not.toContain("approve")
    expect(defaultWorkspaceTab(can)).toBe("coordinate")
  })

  it("chỉ xem: còn tab Tất cả", () => {
    expect(visibleWorkspaceTabs(roleCan(["R1"]))).toEqual(["all"])
    expect(isWorkspaceTab("approve")).toBe(true)
    expect(isWorkspaceTab("kanban")).toBe(false)
  })
})
