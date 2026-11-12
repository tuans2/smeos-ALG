import { describe, expect, it } from "vitest"

import { growthFindings } from "./db-growth"

describe("ngưỡng tăng trưởng bảng (ADR-015 D-O6)", () => {
  it("vượt 20 triệu dòng hoặc 10 GB → xét phân vùng; từ 70% → theo dõi; dưới → không báo", () => {
    const GB = 1024 ** 3
    const f = growthFindings([
      { table: "job_events", rows: 25_000_000, bytes: 3 * GB },
      { table: "audit_logs", rows: 1_000_000, bytes: 11 * GB },
      { table: "orders", rows: 15_000_000, bytes: 1 * GB },
      { table: "products", rows: 10_000, bytes: 0.1 * GB },
    ])
    expect(f.map((x) => [x.table, x.level])).toEqual([["audit_logs", "partition"], ["job_events", "partition"], ["orders", "watch"]])
  })
})
