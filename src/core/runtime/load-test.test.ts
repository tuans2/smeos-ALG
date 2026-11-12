import { describe, expect, it } from "vitest"

import { assertLoadTestDatabaseName, percentile, resultTable, summarize } from "./load-test"

describe("thử tải — phân vị và mục tiêu (ADR-015 D-O1, D-O7)", () => {
  it("phân vị nearest rank", () => {
    const xs = Array.from({ length: 100 }, (_, i) => i + 1)
    expect([percentile(xs, 50), percentile(xs, 95), percentile(xs, 99), percentile(xs, 100)]).toEqual([50, 95, 99, 100])
    expect(percentile([], 95)).toBe(0)
  })

  it("đạt khi p95 ≤ mục tiêu và không lỗi; có lỗi hoặc không mẫu → không đạt", () => {
    const fast = Array.from({ length: 100 }, (_, i) => 10 + i)
    expect(summarize("danh sách đơn", fast, 0, 200)).toMatchObject({ p95: 104, pass: true })
    expect(summarize("danh sách đơn", fast, 1, 200).pass).toBe(false)
    expect(summarize("báo cáo", [3000], 0, 2000).pass).toBe(false)
    expect(summarize("rỗng", [], 0, 200).pass).toBe(false)
    expect(resultTable([summarize("đặt đơn", fast, 0, 200)])).toContain("| đặt đơn | 100 | 0 | 59 ms | 104 ms |")
  })

  it("chỉ chạy trên CSDL tạm: *_test, *_load, *_restore hoặc đúng tên được chỉ định", () => {
    const url = (db: string) => `postgresql://u:p@localhost:5432/${db}`
    expect(assertLoadTestDatabaseName(url("smeos_restore"))).toBe("smeos_restore")
    expect(assertLoadTestDatabaseName(url("floraos_test"))).toBe("floraos_test")
    expect(assertLoadTestDatabaseName(url("smeos_load"))).toBe("smeos_load")
    expect(() => assertLoadTestDatabaseName(url("smeos"))).toThrow(/TỪ CHỐI/)
    expect(() => assertLoadTestDatabaseName(url("smeos_test_backup"))).toThrow(/TỪ CHỐI/)
    expect(() => assertLoadTestDatabaseName(url("smeos"), "khac")).toThrow(/TỪ CHỐI/)
    expect(assertLoadTestDatabaseName(url("pitr_1112"), "pitr_1112")).toBe("pitr_1112")
    expect(() => assertLoadTestDatabaseName(url(""), "")).toThrow(/TỪ CHỐI/)
    expect(() => assertLoadTestDatabaseName("khong-phai-url")).toThrow(/không đọc được/)
  })
})
