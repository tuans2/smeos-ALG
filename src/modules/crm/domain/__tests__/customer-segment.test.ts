import { describe, it, expect } from "vitest"
import {
  evaluateCustomerForSegment,
  customerSegmentRulesSchema,
  mapInteractionChannelToConsentChannel,
  type CustomerEvaluationInput,
  type CustomerSegmentRules,
} from "../customer-segment"

describe("customerSegmentRulesSchema", () => {
  it("validates valid rules", () => {
    const rules = {
      tiers: ["VIP", "GOLD"],
      minSpentVnd: 5_000_000,
      minOrderCount: 3,
      lifecycleStages: ["RETAIN", "GROW"],
      requiredConsentChannel: "ZALO_ZNS",
    }
    const parsed = customerSegmentRulesSchema.parse(rules)
    expect(parsed.tiers).toEqual(["VIP", "GOLD"])
    expect(parsed.minSpentVnd).toBe(5_000_000)
  })

  it("fails on invalid tiers or negative numbers", () => {
    expect(() =>
      customerSegmentRulesSchema.parse({
        tiers: ["UNKNOWN"],
      })
    ).toThrow()

    expect(() =>
      customerSegmentRulesSchema.parse({
        minSpentVnd: -100,
      })
    ).toThrow()
  })
})

describe("mapInteractionChannelToConsentChannel", () => {
  it("maps interaction channels correctly", () => {
    expect(mapInteractionChannelToConsentChannel("ZALO")).toBe("ZALO_ZNS")
    expect(mapInteractionChannelToConsentChannel("SMS")).toBe("SMS")
    expect(mapInteractionChannelToConsentChannel("PHONE")).toBe("PHONE_CALL")
    expect(mapInteractionChannelToConsentChannel("EMAIL")).toBe("PROMOTION")
    expect(mapInteractionChannelToConsentChannel("IN_PERSON")).toBeNull()
  })
})

describe("evaluateCustomerForSegment", () => {
  const baseCustomer: CustomerEvaluationInput = {
    id: "cust-1",
    tier: "GOLD",
    totalSpentVnd: 6_000_000,
    orderCount: 5,
    lastOrderAt: new Date("2026-10-20T10:00:00Z"),
    tags: ["than-thiet", "doanh-nghiep"],
    occasions: [{ name: "Sinh nhật vợ", date: "11-05" }],
    consents: [
      { channel: "ZALO_ZNS", granted: true },
      { channel: "SMS", granted: true, revokedAt: new Date("2026-10-01") },
    ],
  }

  const now = new Date("2026-11-01T00:00:00Z")

  it("returns true when rules are null or empty", () => {
    expect(evaluateCustomerForSegment(baseCustomer, null, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, {}, now)).toBe(true)
  })

  it("evaluates tier filter correctly", () => {
    const rules: CustomerSegmentRules = { tiers: ["GOLD", "VIP"] }
    expect(evaluateCustomerForSegment(baseCustomer, rules, now)).toBe(true)

    const silverRules: CustomerSegmentRules = { tiers: ["SILVER"] }
    expect(evaluateCustomerForSegment(baseCustomer, silverRules, now)).toBe(false)
  })

  it("evaluates spending and order count thresholds", () => {
    expect(evaluateCustomerForSegment(baseCustomer, { minSpentVnd: 5_000_000 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { minSpentVnd: 7_000_000 }, now)).toBe(false)
    expect(evaluateCustomerForSegment(baseCustomer, { maxSpentVnd: 6_000_000 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { maxSpentVnd: 5_999_999 }, now)).toBe(false)

    expect(evaluateCustomerForSegment(baseCustomer, { minOrderCount: 5 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { minOrderCount: 6 }, now)).toBe(false)
    expect(evaluateCustomerForSegment(baseCustomer, { maxOrderCount: 4 }, now)).toBe(false)
  })

  it("evaluates lifecycle stages", () => {
    // baseCustomer: high value (6tr, 5 orders), last order 12 days ago => RETAIN
    expect(evaluateCustomerForSegment(baseCustomer, { lifecycleStages: ["RETAIN"] }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { lifecycleStages: ["DORMANT", "AT_RISK"] }, now)).toBe(false)
  })

  it("evaluates lastPurchasedWithinDays", () => {
    // 12 days ago
    expect(evaluateCustomerForSegment(baseCustomer, { lastPurchasedWithinDays: 15 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { lastPurchasedWithinDays: 10 }, now)).toBe(false)
  })

  it("evaluates notPurchasedForDays (win-back)", () => {
    // 12 days ago
    expect(evaluateCustomerForSegment(baseCustomer, { notPurchasedForDays: 10 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { notPurchasedForDays: 30 }, now)).toBe(false)
  })

  it("evaluates tags", () => {
    expect(evaluateCustomerForSegment(baseCustomer, { tags: ["than-thiet"] }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { tags: ["vip-vang-lai"] }, now)).toBe(false)
  })

  it("evaluates upcoming occasions within days", () => {
    // Occasion date is 11-05, now is 2026-11-01 => 4 days away
    expect(evaluateCustomerForSegment(baseCustomer, { occasionUpcomingWithinDays: 7 }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { occasionUpcomingWithinDays: 3 }, now)).toBe(false)
  })

  it("STRICT CONSENT CHECK: excludes customers who revoked consent or did not grant", () => {
    // Customer granted ZALO_ZNS and not revoked => included
    expect(evaluateCustomerForSegment(baseCustomer, { requiredConsentChannel: "ZALO_ZNS" }, now)).toBe(true)

    // Customer granted SMS but revokedAt is set => EXCLUDED
    expect(evaluateCustomerForSegment(baseCustomer, { requiredConsentChannel: "SMS" }, now)).toBe(false)

    // Customer never granted PHONE_CALL => EXCLUDED
    expect(evaluateCustomerForSegment(baseCustomer, { requiredConsentChannel: "PHONE_CALL" }, now)).toBe(false)
  })

  it("evaluates static customer IDs segment", () => {
    expect(evaluateCustomerForSegment(baseCustomer, { staticCustomerIds: ["cust-1", "cust-2"] }, now)).toBe(true)
    expect(evaluateCustomerForSegment(baseCustomer, { staticCustomerIds: ["cust-99"] }, now)).toBe(false)
  })
})

