import { describe, it, expect } from "vitest"
import {
  calculateRelativeLuminance,
  calculateContrastRatio,
  validateBrandContrast,
  MIN_WCAG_AA_CONTRAST_RATIO,
  uiBrandSettingsSchema,
} from "./brand-config"

describe("Brand Config & WCAG 2.2 AA Contrast Validation", () => {
  it("calculates relative luminance accurately for pure white and black", () => {
    expect(calculateRelativeLuminance("#FFFFFF")).toBeCloseTo(1.0, 4)
    expect(calculateRelativeLuminance("#000000")).toBeCloseTo(0.0, 4)
  })

  it("calculates contrast ratio correctly", () => {
    // White vs Black is 21:1
    const ratio = calculateContrastRatio("#000000", "#FFFFFF")
    expect(ratio).toBeCloseTo(21.0, 1)

    // White vs White is 1:1
    expect(calculateContrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1.0, 1)
  })

  it("approves official theme primary colors (high contrast >= 4.5:1)", () => {
    // Mộc Lan primary #7A2E42 against white #FFFFFF
    const mocLan = validateBrandContrast("#7A2E42")
    expect(mocLan.valid).toBe(true)
    expect(mocLan.ratio).toBeGreaterThanOrEqual(MIN_WCAG_AA_CONTRAST_RATIO)

    // Modern Slate primary #2563EB against white #FFFFFF
    const slate = validateBrandContrast("#2563EB")
    expect(slate.valid).toBe(true)
    expect(slate.ratio).toBeGreaterThanOrEqual(MIN_WCAG_AA_CONTRAST_RATIO)

    // Pure Swiss primary #18181B against white #FFFFFF
    const swiss = validateBrandContrast("#18181B")
    expect(swiss.valid).toBe(true)
    expect(swiss.ratio).toBeGreaterThanOrEqual(MIN_WCAG_AA_CONTRAST_RATIO)
  })

  it("rejects low contrast colors (< 4.5:1 against white)", () => {
    // Light yellow
    const yellow = validateBrandContrast("#FFFF00")
    expect(yellow.valid).toBe(false)
    expect(yellow.ratio).toBeLessThan(MIN_WCAG_AA_CONTRAST_RATIO)
    expect(yellow.error).toContain("không đạt tỷ lệ tối thiểu 4.5:1")

    // Light pink
    const pink = validateBrandContrast("#F5E6EA")
    expect(pink.valid).toBe(false)
    expect(pink.ratio).toBeLessThan(MIN_WCAG_AA_CONTRAST_RATIO)

    // Light green
    const lightGreen = validateBrandContrast("#86EFAC")
    expect(lightGreen.valid).toBe(false)
  })

  it("validates uiBrandSettingsSchema with Zod", () => {
    const valid = uiBrandSettingsSchema.safeParse({
      primary: "#2563EB",
      primaryDark: "#1D4ED8",
      accent: "#EA580C",
    })
    expect(valid.success).toBe(true)

    const invalidHex = uiBrandSettingsSchema.safeParse({
      primary: "not-a-color",
    })
    expect(invalidHex.success).toBe(false)
  })
})

