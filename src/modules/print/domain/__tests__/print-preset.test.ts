import { describe, it, expect } from "vitest"
import {
  PRINT_PRESETS,
  getPrintPreset,
  runPreflightCheck,
  type PrintPresetCode,
} from "../print-preset"

describe("Print Presets & Preflight Engine", () => {
  it("defines all 8 required print presets with accurate specs", () => {
    const requiredCodes: PrintPresetCode[] = [
      "A4",
      "A5",
      "A6",
      "CARD_90X54",
      "STANDEE_60X160",
      "TABLE_TENT_100X150",
      "HANG_TAG_50X90",
      "STICKER_50X50",
    ]

    for (const code of requiredCodes) {
      const preset = getPrintPreset(code)
      expect(preset).toBeDefined()
      expect(preset.code).toBe(code)
      expect(preset.widthMm).toBeGreaterThan(0)
      expect(preset.heightMm).toBeGreaterThan(0)
      expect(preset.bleedMm).toBeGreaterThanOrEqual(2)
      expect(preset.safeMarginMm).toBeGreaterThanOrEqual(2)
      expect(preset.minDpi).toBeGreaterThanOrEqual(150)
      expect(preset.minQrSizeMm).toBeGreaterThanOrEqual(20)
    }
  })

  it("fails preflight check when resolution is critically low (< 150 DPI)", () => {
    const a6 = getPrintPreset("A6") // 105 × 148 mm
    // 300 × 400 px on A6 is ~70 DPI -> Critical failure
    const report = runPreflightCheck(
      {
        imageWidthPx: 300,
        imageHeightPx: 400,
      },
      a6
    )

    expect(report.passed).toBe(false)
    expect(report.errors.length).toBeGreaterThan(0)
    expect(report.errors[0]).toContain("Độ phân giải quá thấp")
  })

  it("warns when resolution is acceptable but below 300 DPI", () => {
    const a6 = getPrintPreset("A6")
    // ~200 DPI
    const report = runPreflightCheck(
      {
        imageWidthPx: 850,
        imageHeightPx: 1200,
      },
      a6
    )

    expect(report.passed).toBe(true)
    expect(report.warnings.length).toBeGreaterThan(0)
    expect(report.warnings[0]).toContain("khuyến nghị 300 DPI")
  })

  it("fails preflight check when QR code is smaller than minimum scanning threshold", () => {
    const a6 = getPrintPreset("A6")
    const report = runPreflightCheck(
      {
        imageWidthPx: 1400,
        imageHeightPx: 1900,
        hasQrCode: true,
        qrSizeMm: 12, // Less than 20mm
      },
      a6
    )

    expect(report.passed).toBe(false)
    expect(report.errors.some((e) => e.toLowerCase().includes("mã qr"))).toBe(true)
  })

  it("warns about safe zone infringement and RGB color mode", () => {
    const card = getPrintPreset("CARD_90X54")
    const report = runPreflightCheck(
      {
        imageWidthPx: 1200,
        imageHeightPx: 750,
        colorMode: "RGB",
        hasContentOutsideSafeZone: true,
      },
      card
    )

    expect(report.passed).toBe(true) // Warnings do not fail the build
    expect(report.warnings.some((w) => w.includes("vùng an toàn") || w.includes("sát mép"))).toBe(true)
    expect(report.warnings.some((w) => w.includes("RGB"))).toBe(true)
  })

  it("passes cleanly when all technical parameters are met", () => {
    const a6 = getPrintPreset("A6")
    const report = runPreflightCheck(
      {
        imageWidthPx: 1400,
        imageHeightPx: 1900,
        hasQrCode: true,
        qrSizeMm: 25,
        colorMode: "CMYK",
        hasContentOutsideSafeZone: false,
      },
      a6
    )

    expect(report.passed).toBe(true)
    expect(report.errors).toHaveLength(0)
    expect(report.warnings).toHaveLength(0)
  })
})
