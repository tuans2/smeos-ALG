import { describe, expect, it } from "vitest"

import { isAbove, resolveLayered, winningLock } from "./layered-resolver"

const fallback = { value: 10, source: "DEFAULT" as const }

describe("layered-resolver — lõi phân giải phân tầng dùng chung", () => {
  it("không khoá, không ghi đè → mặc định", () => {
    expect(resolveLayered({ locks: [], overrides: [], fallback })).toEqual({ value: 10, source: "DEFAULT", lockedBy: null })
  })

  it("khoá MOTHER thắng khoá CHAIN và mọi ghi đè, bất kể thứ tự truyền vào", () => {
    const r = resolveLayered({
      locks: [
        { tier: "CHAIN", value: 70, source: "LOCK" },
        { tier: "MOTHER", value: 50, source: "LOCK" },
      ],
      overrides: [{ value: 90, source: "STORE" }],
      fallback,
    })
    expect(r).toEqual({ value: 50, source: "LOCK", lockedBy: "MOTHER" })
  })

  it("khoá của Chuỗi chặn ghi đè của Tiệm", () => {
    const r = resolveLayered({ locks: [{ tier: "CHAIN", value: 70, source: "LOCK" }], overrides: [{ value: 30, source: "STORE" }], fallback })
    expect(r.value).toBe(70)
    expect(r.lockedBy).toBe("CHAIN")
  })

  it("cùng tầng → khoá đứng trước thắng", () => {
    const lock = winningLock([
      { tier: "MOTHER" as const, id: "built-in" },
      { tier: "MOTHER" as const, id: "saved" },
    ])
    expect(lock?.id).toBe("built-in")
  })

  it("kế thừa từ dưới lên: Tiệm thắng Chuỗi, Ngành khi không khoá", () => {
    const r = resolveLayered({
      locks: [],
      overrides: [
        { value: 30, source: "STORE" },
        { value: 40, source: "CHAIN" },
        { value: 50, source: "INDUSTRY" },
      ],
      fallback,
    })
    expect(r).toEqual({ value: 30, source: "STORE", lockedBy: null })
  })

  it("bỏ qua ghi đè rỗng: tầng trên kế tiếp thắng khi tầng dưới chưa đặt", () => {
    const r = resolveLayered({
      locks: [],
      overrides: [
        { value: undefined, source: "STORE" },
        { value: null, source: "CHAIN" },
        { value: 50, source: "INDUSTRY" },
      ],
      fallback,
    })
    expect(r.source).toBe("INDUSTRY")
  })

  it("giữ giá trị false (không coi là rỗng)", () => {
    const r = resolveLayered({ locks: [], overrides: [{ value: false, source: "OWN" }], fallback: { value: true, source: "DEFAULT" } })
    expect(r).toEqual({ value: false, source: "OWN", lockedBy: null })
  })

  it("thứ tự tầng", () => {
    expect(isAbove("MOTHER", "STORE")).toBe(true)
    expect(isAbove("STORE", "CHAIN")).toBe(false)
  })
})
