import { z } from "zod"

export interface UiBrandSettings {
  primary: string
  primaryDark?: string | undefined
  primaryMuted?: string | undefined
  primaryBorder?: string | undefined
  accent?: string | undefined
  logoUrl?: string | undefined
}

export const uiBrandSettingsSchema = z.object({
  primary: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu chính phải có định dạng mã màu hex 6 ký tự (#RRGGBB)"),
  primaryDark: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu primaryDark phải có định dạng #RRGGBB")
    .optional(),
  primaryMuted: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu primaryMuted phải có định dạng #RRGGBB")
    .optional(),
  primaryBorder: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu primaryBorder phải có định dạng #RRGGBB")
    .optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu accent phải có định dạng #RRGGBB")
    .optional(),
  logoUrl: z.string().url("URL logo không hợp lệ").optional(),
})

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleaned = hex.trim().replace(/^#/, "")
  if (cleaned.length === 3) {
    return {
      r: parseInt(cleaned[0]! + cleaned[0]!, 16),
      g: parseInt(cleaned[1]! + cleaned[1]!, 16),
      b: parseInt(cleaned[2]! + cleaned[2]!, 16),
    }
  }
  if (cleaned.length === 6) {
    return {
      r: parseInt(cleaned.slice(0, 2), 16),
      g: parseInt(cleaned.slice(2, 4), 16),
      b: parseInt(cleaned.slice(4, 6), 16),
    }
  }
  return null
}

/**
 * Tính Relative Luminance theo chuẩn WCAG 2.1 / 2.2 §1.4.3.
 */
export function calculateRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const s = val / 255
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0)
}

/**
 * Tính tỷ lệ tương phản Contrast Ratio giữa 2 màu hex.
 */
export function calculateContrastRatio(hex1: string, hex2: string): number {
  const l1 = calculateRelativeLuminance(hex1)
  const l2 = calculateRelativeLuminance(hex2)
  const brighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (brighter + 0.05) / (darker + 0.05)
}

export const MIN_WCAG_AA_CONTRAST_RATIO = 4.5

/**
 * Kiểm tra tỷ lệ tương phản tối thiểu 4.5:1 với nền trắng và nền kem (ADR-011 D-UI-03).
 */
export function validateBrandContrast(
  primaryHex: string,
  backgroundHex: string = "#FFFFFF"
): {
  valid: boolean
  ratio: number
  error?: string
} {
  const ratio = calculateContrastRatio(primaryHex, backgroundHex)
  if (ratio < MIN_WCAG_AA_CONTRAST_RATIO) {
    return {
      valid: false,
      ratio: Math.round(ratio * 100) / 100,
      error: `Độ tương phản của màu chính (${primaryHex}) với nền (${backgroundHex}) chỉ đạt ${ratio.toFixed(2)}:1, không đạt tỷ lệ tối thiểu ${MIN_WCAG_AA_CONTRAST_RATIO}:1 theo chuẩn WCAG 2.2 AA.`,
    }
  }
  return { valid: true, ratio: Math.round(ratio * 100) / 100 }
}

