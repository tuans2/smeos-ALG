import { describe, expect, it } from "vitest"

import {
  diffDecisions,
  integrationRecord,
  matrixRecords,
  notificationLockRecord,
  notificationVisibilityRecord,
  sameDecisionValue,
  type DecisionRecord,
} from "./decision-record"

const scope = "org:o-1"
const matrix = (overrides: Record<string, boolean>, locks: Record<string, { enabled: boolean }> = {}) =>
  matrixRecords({ system: "PAYMENTS", tier: "CHAIN", scope, decisions: { overrides, locks }, decidedBy: "u-1" })

describe("bản ghi governance_decisions (ADR-012 T-7a)", () => {
  it("ma trận: ghi đè là locked=false, khoá là locked=true, cùng dạng giá trị {enabled}", () => {
    expect(matrix({ vietqr: false }, { deposit_min: { enabled: true } })).toEqual([
      { system: "matrix:PAYMENTS", tier: "CHAIN", scope, decidedBy: "u-1", decisionKey: "vietqr", locked: false, value: { enabled: false } },
      { system: "matrix:PAYMENTS", tier: "CHAIN", scope, decidedBy: "u-1", decisionKey: "deposit_min", locked: true, value: { enabled: true } },
    ])
  })

  it("so giá trị không phụ thuộc thứ tự khoá; null chỉ bằng null", () => {
    expect(sameDecisionValue({ a: 1, b: null }, { b: null, a: 1 })).toBe(true)
    expect(sameDecisionValue({ a: 1 }, { a: 2 })).toBe(false)
    expect(sameDecisionValue({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    expect(sameDecisionValue(null, null)).toBe(true)
    expect(sameDecisionValue(null, { a: 1 })).toBe(false)
  })

  it("diff: không đổi → không dòng; đổi giá trị → một dòng; bỏ khỏi tập → dòng gỡ", () => {
    const current = matrix({ vietqr: false, cod: true })
    expect(diffDecisions(current, current)).toEqual([])
    const next = matrix({ vietqr: true })
    const out = diffDecisions(current, next)
    expect(out.map((d) => [d.decisionKey, d.value])).toEqual([
      ["vietqr", { enabled: true }],
      ["cod", null],
    ])
  })

  it("diff: dòng gỡ đang có không bị gỡ lần nữa; khoá và ghi đè cùng tên là hai quyết định", () => {
    const removed: DecisionRecord = { ...matrix({ cod: true })[0]!, value: null }
    expect(diffDecisions([removed], [])).toEqual([])
    const both = matrix({ cod: true }, { cod: { enabled: false } })
    expect(diffDecisions(matrix({ cod: true }), both).map((d) => d.locked)).toEqual([true])
  })

  it("thông báo và tích hợp: phạm vi đổi sang D-T5; gỡ khoá / ALLOW_OWN là value null", () => {
    expect(notificationLockRecord({ eventKey: "ORDER_RECEIVED", channel: "EMAIL", tier: "MOTHER", scopeId: "GLOBAL", enabled: false, decidedBy: "op" }))
      .toMatchObject({ system: "notification.hard_lock", decisionKey: "ORDER_RECEIVED:EMAIL", scope: "platform", locked: true, value: { enabled: false, reason: null } })
    expect(notificationLockRecord({ eventKey: "E", channel: "APP_INBOX", tier: "CHAIN", scopeId: "o-1", enabled: null, decidedBy: null }))
      .toMatchObject({ scope: "org:o-1", value: null })
    expect(notificationVisibilityRecord({ eventKey: "E", targetTier: "STORE", visible: false, decidedBy: "op" }))
      .toMatchObject({ decisionKey: "E:STORE", tier: "MOTHER", scope: "platform", locked: false, value: { visible: false } })
    expect(integrationRecord({ connectorKey: "zalo_oa", tier: "CHAIN", scopeId: "o-1", mode: "FORBID", decidedBy: "u" }))
      .toMatchObject({ system: "integration", scope: "org:o-1", value: { mode: "FORBID" } })
    expect(integrationRecord({ connectorKey: "zalo_oa", tier: "CHAIN", scopeId: "o-1", mode: "ALLOW_OWN", decidedBy: "u" }).value).toBeNull()
  })
})
