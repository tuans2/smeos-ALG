import { describe, expect, it } from "vitest"
import { applyGovernanceDecisions, nextDecisions } from "../apply-governance-decisions"
import type { GovernanceMatrixGroup } from "../governance-matrix-types"

const base: GovernanceMatrixGroup[] = [
  {
    groupKey: "g",
    groupTitle: "G",
    items: [
      { key: "a", title: "A", groupKey: "g", groupTitle: "G", enabled: true, decidedBy: "INDUSTRY", isLocked: false, hardLockedBy: null, isOwnHardLock: false, hasLocalOverride: false },
    ],
  },
]

describe("applyGovernanceDecisions / nextDecisions", () => {
  it("hiện khoá của chuỗi cho cửa hàng", () => {
    const [g] = applyGovernanceDecisions(base, { overrides: {}, locks: {} }, "STORE", [{ tier: "CHAIN", decisions: { overrides: {}, locks: { a: { enabled: false } } } }])
    expect(g!.items[0]).toMatchObject({ enabled: false, isLocked: true, hardLockedBy: "CHAIN", decidedBy: "HARD_LOCK_CHAIN", isOwnHardLock: false })
  })

  it("bật/tắt rồi đặt lại thì về mặc định; khoá giữ trạng thái đang bật", () => {
    let own = nextDecisions({ overrides: {}, locks: {} }, { kind: "toggle", key: "a", enabled: false })
    expect(own.overrides).toEqual({ a: false })
    own = nextDecisions(own, { kind: "lock", key: "a", locked: true, enabled: false })
    expect(own.locks).toEqual({ a: { enabled: false } })
    own = nextDecisions(own, { kind: "reset", key: "a" })
    expect(own).toEqual({ overrides: {}, locks: {} })
  })
})
