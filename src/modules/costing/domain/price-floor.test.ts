import { describe, expect, it } from "vitest"

import { belowFloorMessage, floorPriceVnd } from "./price-floor"

describe("giá sàn (checklist ALG 3.4)", () => {
  it("sàn = giá vốn × hệ số, làm tròn lên nghìn; thiếu giá vốn hoặc hệ số thì 0", () => {
    expect(floorPriceVnd(301_200, 1.2)).toBe(362_000)
    expect(floorPriceVnd(0, 1.2)).toBe(0)
    expect(floorPriceVnd(300_000, 0)).toBe(0)
  })

  it("chặn khi tổng thấp hơn sàn, không chặn khi bằng/cao hơn hoặc không có sàn", () => {
    expect(belowFloorMessage(300_000, 362_000)).toMatch(/thấp hơn giá sàn 362\.000/)
    expect(belowFloorMessage(362_000, 362_000)).toBeNull()
    expect(belowFloorMessage(100_000, 0)).toBeNull()
  })
})
