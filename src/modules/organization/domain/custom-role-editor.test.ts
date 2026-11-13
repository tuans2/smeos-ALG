import { describe, expect, it } from "vitest"

import { HARD_CAPPED_CODES } from "@/core/rbac/capability-catalog"
import { capabilityChanges, editableCapabilityGroups, roleNameProblem } from "./custom-role-editor"

describe("màn vai trò tuỳ chỉnh (ALG 1.13)", () => {
  it("không liệt kê quyền có trần cứng — vai tự tạo không bao giờ giữ được", () => {
    const codes = editableCapabilityGroups().flatMap((g) => g.items.map((i) => i.code))
    for (const code of HARD_CAPPED_CODES) expect(codes, code).not.toContain(code)
    expect(codes).toContain("R1")
  })

  it("mỗi nhóm có nhãn tiếng Việt, không nhóm rỗng", () => {
    for (const g of editableCapabilityGroups()) {
      expect(g.label.length, g.group).toBeGreaterThan(2)
      expect(g.items.length, g.group).toBeGreaterThan(0)
    }
  })

  it("chỉ gửi mã đổi trạng thái", () => {
    expect(capabilityChanges(new Set(["R1", "R2"]), new Set(["R2", "Q1"]))).toEqual([
      { code: "Q1", allowed: true },
      { code: "R1", allowed: false },
    ])
    expect(capabilityChanges(new Set(["R1"]), new Set(["R1"]))).toEqual([])
  })

  it("tên vai 2–60 ký tự", () => {
    expect(roleNameProblem(" a ")).not.toBeNull()
    expect(roleNameProblem("Trưởng ca")).toBeNull()
    expect(roleNameProblem("x".repeat(61))).not.toBeNull()
  })
})
