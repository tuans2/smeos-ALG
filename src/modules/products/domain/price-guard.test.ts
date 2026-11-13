/**
 * Bản dịch của `FloraOS/floraos-web/tests/chanGia.test.ts` (85 dòng) sang
 * `vitest` + định danh tiếng Anh. V4: Sàn/Trần chỉ cảnh báo tham khảo, không
 * chặn cứng — không ca nào có `blocked: true`.
 */
import { describe, expect, it } from "vitest"

import { checkPriceGuard, type FloorCeilingLookup } from "./price-guard"

const LIMITS: FloorCeilingLookup = { has: true, floorVnd: 400000, ceilingVnd: 600000 }

describe("checkPriceGuard", () => {
  it("trong khoảng Sàn–Trần thì không cảnh báo", () => {
    const result = checkPriceGuard({ code: "BHBB0001", priceVnd: 500000, limits: LIMITS })
    expect(result).toMatchObject({ blocked: false, belowFloor: false, aboveCeiling: false, warning: "" })
  })

  it("dưới Sàn thì KHÔNG chặn, chỉ cảnh báo tham khảo", () => {
    const result = checkPriceGuard({ code: "BHBB0001", priceVnd: 350000, limits: LIMITS })
    expect(result.blocked).toBe(false)
    expect(result.belowFloor).toBe(true)
    expect(result.warning).toMatch(/Tham khảo/)
    expect(result.warning).toMatch(/BHBB0001/)
  })

  it("vượt Trần thì KHÔNG chặn, chỉ cảnh báo tham khảo", () => {
    const result = checkPriceGuard({ code: "BHBB0001", priceVnd: 700000, limits: LIMITS })
    expect(result.blocked).toBe(false)
    expect(result.aboveCeiling).toBe(true)
    expect(result.warning).toMatch(/Tham khảo/)
  })

  it("mã không tra được thì không cảnh báo", () => {
    const result = checkPriceGuard({
      code: "KG-20260820-001",
      priceVnd: 1000,
      limits: { has: false, floorVnd: 0, ceilingVnd: 0 },
    })
    expect(result).toMatchObject({ blocked: false, warning: "" })
  })

  it("mã có quy tắc nhưng chưa khai Sàn/Trần thì không cảnh báo", () => {
    const result = checkPriceGuard({
      code: "BHBB0002",
      priceVnd: 1000,
      limits: { has: true, floorVnd: 0, ceilingVnd: 0 },
    })
    expect(result).toMatchObject({ blocked: false, warning: "" })
  })

  it("chỉ khai Sàn — dưới Sàn cảnh báo, vượt số lớn không khai Trần thì không cảnh báo", () => {
    const onlyFloor: FloorCeilingLookup = { has: true, floorVnd: 400000, ceilingVnd: 0 }
    const below = checkPriceGuard({ code: "X", priceVnd: 300000, limits: onlyFloor })
    expect(below.belowFloor).toBe(true)
    const high = checkPriceGuard({ code: "X", priceVnd: 9_000_000, limits: onlyFloor })
    expect(high.aboveCeiling).toBe(false)
  })

  it("giá đúng bằng Sàn hoặc bằng Trần thì qua, không cảnh báo", () => {
    const atFloor = checkPriceGuard({ code: "X", priceVnd: 400000, limits: LIMITS })
    expect(atFloor).toMatchObject({ belowFloor: false, warning: "" })
    const atCeiling = checkPriceGuard({ code: "X", priceVnd: 600000, limits: LIMITS })
    expect(atCeiling).toMatchObject({ aboveCeiling: false, warning: "" })
  })
})
