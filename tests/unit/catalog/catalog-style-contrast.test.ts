import { describe, expect, it } from "vitest"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"

/** WCAG AA 4,5:1 cho chữ/nút trên trang khách xem (OPERATING_PRINCIPLES §3). Màu không phải hex 6 số (rgba) bỏ qua. */
function luminance(hex: string): number | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!m) return null
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1]!.slice(i, i + 2), 16) / 255).map((c) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  )
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
function contrast(a: string, b: string): number | null {
  const x = luminance(a)
  const y = luminance(b)
  if (x == null || y == null) return null
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

describe("tương phản màu 12 phong cách catalog", () => {
  for (const style of Object.values(CATALOG_STYLES)) {
    it(style.id, () => {
      const t = style.tokens
      const pairs: Array<[string, string, string, number?]> = [
        ["chữ nút trên nền nút", t.ctaText, t.ctaBg],
        // Biên 5,5 vì màu nhấn còn đặt trên nền pha 10% chính nó (nhãn, huy hiệu)
        ["nút/chữ nhấn trên nền trang", t.ctaBg, t.background, 5.5],
        ["chữ phụ trên nền thẻ", t.textSecondary, t.cardBg],
        ["chữ phụ trên nền trang", t.textSecondary, t.background],
      ]
      for (const [label, fg, bg, min = 4.5] of pairs) {
        const ratio = contrast(fg, bg)
        if (ratio != null) expect(ratio, `${label}: ${fg} / ${bg}`).toBeGreaterThanOrEqual(min)
      }
    })
  }
})
