import { describe, expect, it } from "vitest"
import type { DecisionRecord } from "@/core/governance/decision-record"

import { decisionsFromRecords, effectiveDecision, parseDecisions, validateDecisions, type UpperLayer } from "./governance-decisions"

const upper: UpperLayer[] = [
  { tier: "MOTHER", decisions: { overrides: {}, locks: { deposit_min: { enabled: true } } } },
  { tier: "CHAIN", decisions: { overrides: {}, locks: { deposit_min: { enabled: false }, voucher: { enabled: false } } } },
]

describe("governance-decisions", () => {
  it("khoá tầng trên cùng thắng khoá tầng dưới và ghi đè của tầng đang xem", () => {
    const own = { overrides: { deposit_min: false }, locks: {} }
    expect(effectiveDecision("deposit_min", false, own, "STORE", upper)).toEqual({ enabled: true, source: "UPPER_LOCK", lockedBy: "MOTHER" })
    expect(effectiveDecision("voucher", true, own, "STORE", upper)).toEqual({ enabled: false, source: "UPPER_LOCK", lockedBy: "CHAIN" })
  })

  it("không có khoá thì ghi đè của mình, rồi mới tới mặc định", () => {
    const own = { overrides: { a: false }, locks: { b: { enabled: true } } }
    expect(effectiveDecision("a", true, own, "CHAIN", []).source).toBe("OWN_OVERRIDE")
    expect(effectiveDecision("b", false, own, "CHAIN", [])).toEqual({ enabled: true, source: "OWN_LOCK", lockedBy: "CHAIN" })
    expect(effectiveDecision("c", true, own, "CHAIN", [])).toEqual({ enabled: true, source: "DEFAULT", lockedBy: null })
  })

  it("từ chối ghi đè mục tầng trên đã khoá và khoá ở cấp cửa hàng", () => {
    const v = validateDecisions({ overrides: { voucher: true, free: true }, locks: { x: { enabled: true } } }, "STORE", upper)
    expect(v).toEqual([
      { key: "voucher", reason: "LOCKED_BY_UPPER" },
      { key: "x", reason: "STORE_CANNOT_LOCK" },
    ])
    expect(validateDecisions({ overrides: { free: true }, locks: { x: { enabled: true } } }, "CHAIN", [upper[0]!])).toEqual([])
  })

  it("đọc dữ liệu lưu an toàn, bỏ khoá sai định dạng", () => {
    expect(parseDecisions({ overrides: { ok: true, "bad key": true, n: 1 }, locks: { l: { enabled: false }, m: {} } })).toEqual({
      overrides: { ok: true },
      locks: { l: { enabled: false } },
    })
  })

  it("dựng quyết định từ bản ghi governance_decisions: đúng hệ thống, đúng dạng, bỏ dòng lạ (T-7b)", () => {
    const rec = (system: string, decisionKey: string, locked: boolean, value: DecisionRecord["value"]): DecisionRecord =>
      ({ system: system as DecisionRecord["system"], decisionKey, tier: "CHAIN", scope: "org:o", locked, value, decidedBy: null })
    const records = [
      rec("matrix:PAYMENTS", "a", false, { enabled: true }),
      rec("matrix:PAYMENTS", "b", true, { enabled: false }),
      rec("matrix:PROMOTIONS", "c", false, { enabled: false }),
      rec("matrix:PAYMENTS", "bad key", false, { enabled: true }),
      rec("matrix:PAYMENTS", "d", false, { enabled: "yes" }),
    ]
    expect(decisionsFromRecords(records, "PAYMENTS")).toEqual({ overrides: { a: true }, locks: { b: { enabled: false } } })
    expect(decisionsFromRecords([], "PAYMENTS")).toEqual({ overrides: {}, locks: {} })
  })
})

describe("quy chuẩn bất biến của nền tảng", () => {
  it("tầng dưới không ghi đè được, kể cả tầng Mẹ đã lưu mở", async () => {
    const { withBuiltInLocks, isGovernedItemEnabled, validateDecisions: v } = await import("./governance-decisions")
    const upper = withBuiltInLocks("PROMOTIONS", [{ tier: "MOTHER", decisions: { overrides: {}, locks: { MAX_DISCOUNT_PERCENT: { enabled: false } } } }])
    expect(isGovernedItemEnabled("MAX_DISCOUNT_PERCENT", { overrides: { MAX_DISCOUNT_PERCENT: false }, locks: {} }, "PROMOTIONS", upper)).toBe(true)
    expect(v({ overrides: { MAX_DISCOUNT_PERCENT: false }, locks: {} }, "CHAIN", upper)).toEqual([{ key: "MAX_DISCOUNT_PERCENT", reason: "LOCKED_BY_UPPER" }])
  })
})
