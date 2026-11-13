import { describe, expect, it } from "vitest"

import {
  DEFAULT_PRICE_BUDGETS,
  PRICE_BUDGETS_SETTINGS_KEY,
  defaultBudgetLabel,
  formatPriceShort,
  generatePriceBudgets,
  priceBudgetErrors,
  readPriceBudgets,
  serializePriceBudgets,
  toInclusiveRange,
} from "./price-budgets"

const shopRanges = [
  { id: "x", label: "", min: 400_000, max: 600_000 },
  { id: "y", label: "", min: 600_000, max: 800_000 },
  { id: "z", label: "", min: 800_000, max: 900_000 },
  { id: "w", label: "900k - 1tr5", min: 900_000, max: 1_500_000 },
  { id: "v", label: "", min: 1_500_000, max: null },
]

describe("price budgets", () => {
  it("falls back to defaults when nothing is configured or data is broken", () => {
    expect(readPriceBudgets(null)).toEqual(DEFAULT_PRICE_BUDGETS)
    expect(readPriceBudgets({ [PRICE_BUDGETS_SETTINGS_KEY]: "nope" })).toEqual(DEFAULT_PRICE_BUDGETS)
    expect(readPriceBudgets({ [PRICE_BUDGETS_SETTINGS_KEY]: [{ min: 5, max: 1 }] })).toEqual(DEFAULT_PRICE_BUDGETS)
  })

  it("reads shop ranges sorted by price and fills empty labels", () => {
    const read = readPriceBudgets({ [PRICE_BUDGETS_SETTINGS_KEY]: [...shopRanges].reverse() })
    expect(read.map((b) => b.label)).toEqual([
      "400k - <600k",
      "600k - <800k",
      "800k - <900k",
      "900k - 1tr5",
      "Từ 1tr5",
    ])
  })

  it("formats short prices", () => {
    expect(formatPriceShort(400_000)).toBe("400k")
    expect(formatPriceShort(1_500_000)).toBe("1tr5")
    expect(formatPriceShort(2_000_000)).toBe("2tr")
    expect(formatPriceShort(1_250_000)).toBe("1tr250k")
    expect(defaultBudgetLabel(0, 500_000)).toBe("Dưới 500k")
  })

  it("rejects overlapping or inverted ranges, accepts touching ones", () => {
    expect(priceBudgetErrors(shopRanges)).toEqual([])
    expect(priceBudgetErrors([{ id: "a", label: "", min: 500_000, max: 400_000 }])).toHaveLength(1)
    expect(
      priceBudgetErrors([
        { id: "a", label: "", min: 0, max: 700_000 },
        { id: "b", label: "", min: 600_000, max: 800_000 },
      ]),
    ).toHaveLength(1)
    expect(priceBudgetErrors([])).toHaveLength(1)
  })

  it("serializes with stable ids and generated labels", () => {
    const out = serializePriceBudgets([shopRanges[1]!, shopRanges[0]!])
    expect(out).toEqual([
      { id: "p1", label: "400k - <600k", min: 400_000, max: 600_000 },
      { id: "p2", label: "600k - <800k", min: 600_000, max: 800_000 },
    ])
  })

  it("generates even steps with an open-ended last range", () => {
    const out = generatePriceBudgets(400_000, 1_000_000, 200_000)
    expect(out.map((b) => [b.min, b.max])).toEqual([
      [400_000, 600_000],
      [600_000, 800_000],
      [800_000, 1_000_000],
      [1_000_000, null],
    ])
    expect(generatePriceBudgets(1, 0, 1)).toEqual([])
  })

  it("keeps the upper bound exclusive for the inclusive product filter", () => {
    const r = toInclusiveRange(shopRanges[0]!)
    expect(600_000 <= r.max).toBe(false)
    expect(599_999 <= r.max).toBe(true)
    expect(toInclusiveRange(shopRanges[4]!).max).toBe(Number.MAX_SAFE_INTEGER)
  })
})
