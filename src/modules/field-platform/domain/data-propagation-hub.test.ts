import { describe, expect, it } from "vitest"
import {
  resolvePropagationTarget,
  transformForPropagation,
} from "./data-propagation-hub"

describe("Data Propagation Hub (§9.5)", () => {
  it("resolves target within bounds (floor <= choice <= ceiling)", () => {
    const result = resolvePropagationTarget({
      fieldCeiling: "RAW",
      floorByParent: "AGGREGATED",
      choiceByStore: "MASKED",
    })

    expect(result.isValid).toBe(true)
    expect(result.effectiveCeiling).toBe("RAW")
    expect(result.effectiveTarget).toBe("MASKED")
  })

  it("clamps choice down to ceiling when store chooses higher than allowed", () => {
    const result = resolvePropagationTarget({
      fieldCeiling: "MASKED", // Ceiling is MASKED
      floorByParent: "NONE",
      choiceByStore: "RAW", // Store wants RAW
    })

    expect(result.isValid).toBe(true)
    expect(result.effectiveTarget).toBe("MASKED")
  })

  it("raises choice up to floor when store chooses lower than parent floor", () => {
    const result = resolvePropagationTarget({
      fieldCeiling: "RAW",
      floorByParent: "AGGREGATED", // Parent enforces at least AGGREGATED
      choiceByStore: "NONE", // Store chose NONE
    })

    expect(result.isValid).toBe(true)
    expect(result.effectiveTarget).toBe("AGGREGATED")
  })

  it("rejects configuration when parent floor exceeds ceiling", () => {
    const result = resolvePropagationTarget({
      fieldCeiling: "MASKED",
      programScope: "AGGREGATED", // Program restricts to AGGREGATED
      floorByParent: "RAW", // Parent tries to force RAW (illegal!)
      choiceByStore: "AGGREGATED",
    })

    expect(result.isValid).toBe(false)
    expect(result.error).toContain("vượt quá trần cho phép")
  })

  describe("transformForPropagation()", () => {
    it("masks string with MASK_MIDDLE rule", () => {
      const raw = "0987654321"
      const transformed = transformForPropagation(raw, "MASKED", "MASK_MIDDLE")
      expect(transformed).toBe("09****21")
    })

    it("returns raw value when target is RAW", () => {
      const raw = { price: 500000 }
      expect(transformForPropagation(raw, "RAW")).toEqual(raw)
    })

    it("returns undefined when target is NONE", () => {
      expect(transformForPropagation("secret_key", "NONE")).toBeUndefined()
    })
  })
})
