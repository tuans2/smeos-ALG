import { describe, expect, it } from "vitest"

import { branchScopeFor, scopedWhereForBranch } from "./branch-scope"
import { isBranchScopeWaveEnabled } from "./branch-scope-rollout"

/** ADR-012 D-T7, bước T-5: phạm vi chi nhánh theo từng mã quyền. */
describe("branchScopeFor — phạm vi theo mã quyền", () => {
  const staff = { branchId: "b1", capabilities: new Set(["Q1"]) }
  const manager = { branchId: "b1", capabilities: new Set(["Q1", "F7"]) }

  it("phạm vi tổ chức (mặc định): có chi nhánh mà không có F7 thì giới hạn; F7 thì không", () => {
    expect(branchScopeFor(staff, "Q1")).toBe("b1")
    expect(branchScopeFor(manager, "Q1")).toBeNull()
    expect(branchScopeFor({ ...staff, grants: new Map([["Q1", "ORGANIZATION"]]) }, "Q1")).toBe("b1")
  })

  it("mã cấp phạm vi BRANCH: luôn giới hạn vào chi nhánh của người đó, kể cả khi có F7", () => {
    expect(branchScopeFor({ ...manager, grants: new Map([["Q1", "BRANCH"]]) }, "Q1")).toBe("b1")
    expect(branchScopeFor({ ...manager, grants: new Map([["Q1", "BRANCH"]]) }, "R1")).toBeNull()
  })

  it("không có chi nhánh: không giới hạn", () => {
    expect(branchScopeFor({ branchId: null, capabilities: new Set(), grants: new Map([["Q1", "BRANCH"]]) }, "Q1")).toBeNull()
    expect(scopedWhereForBranch({ branchId: null, capabilities: new Set() }, "Q1")).toEqual({})
    expect(scopedWhereForBranch(staff, "Q1")).toEqual({ branch_id: "b1" })
  })
})

describe("cờ phạm vi chi nhánh theo đợt (D-59)", () => {
  it("mặc định tắt; chỉ true mới bật", () => {
    expect(isBranchScopeWaveEnabled(null, "wave1")).toBe(false)
    expect(isBranchScopeWaveEnabled({}, "wave1")).toBe(false)
    expect(isBranchScopeWaveEnabled({ branch_scope: { wave1: "true" } }, "wave1")).toBe(false)
    expect(isBranchScopeWaveEnabled({ branch_scope: { wave1: true } }, "wave1")).toBe(true)
  })
})
