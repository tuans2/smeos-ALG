import { describe, expect, it } from "vitest"

import { sortByRisk } from "./risk-order"

describe("thứ tự bảng điều phối theo rủi ro trễ giờ (checklist ALG 4.12)", () => {
  it("Đã trễ → Nguy cơ trễ → Cần chú ý → Bình thường; cùng mức giữ thứ tự cũ", () => {
    const rows = [
      { id: "a", riskLevel: "NORMAL" as const },
      { id: "b", riskLevel: "AT_RISK" as const },
      { id: "c", riskLevel: "CRITICAL" as const },
      { id: "d", riskLevel: "NORMAL" as const },
      { id: "e", riskLevel: "ATTENTION" as const },
    ]
    expect(sortByRisk(rows).map((r) => r.id)).toEqual(["c", "b", "e", "a", "d"])
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c", "d", "e"])
  })
})
