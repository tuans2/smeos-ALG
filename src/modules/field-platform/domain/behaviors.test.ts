import { describe, expect, it } from "vitest"
import {
  isKnownBehaviorKind,
  isKnownBehaviorCode,
  listBehaviorCodes,
  ALL_BEHAVIOR_KINDS,
} from "./behaviors"

describe("behaviors — danh mục hành vi (3.3)", () => {
  it("nhận diện đúng các loại hành vi có thật", () => {
    for (const kind of ["SLA", "PRIORITY_TIER", "ORDER_TYPE", "DELIVERY_LOCATION", "DELIVERY_TYPE", "PAYMENT_METHOD", "COLLECTION_METHOD"]) {
      expect(isKnownBehaviorKind(kind)).toBe(true)
    }
    expect(isKnownBehaviorKind("KHONG_TON_TAI")).toBe(false)
  })

  it("mã hành vi phải có thật trong đúng loại của nó", () => {
    expect(isKnownBehaviorCode("SLA", "OFFSET")).toBe(true)
    expect(isKnownBehaviorCode("SLA", "GIFT")).toBe(false) // sai loại
    expect(isKnownBehaviorCode("ORDER_TYPE", "GIFT")).toBe(true)
    expect(isKnownBehaviorCode("KHONG_TON_TAI", "OFFSET")).toBe(false)
  })

  it("mỗi loại hành vi liệt kê đủ mã", () => {
    expect(listBehaviorCodes("PRIORITY_TIER")).toEqual(["TIER_1", "TIER_2", "TIER_3", "TIER_4"])
    expect(ALL_BEHAVIOR_KINDS.length).toBeGreaterThanOrEqual(7)
  })
})
