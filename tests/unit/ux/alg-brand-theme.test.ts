import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Đổi nhận diện ALG mức 3 (12/11/2026): preset `alg` là mặc định; mọi cặp chữ/nền phải đạt WCAG AA.
const root = process.cwd()
const themes = readFileSync(join(root, "src/styles/tokens/themes.css"), "utf8")
const block = themes.match(/\[data-theme="alg"\][^{]*\{([^}]*)\}/)?.[1] ?? ""
const tokens = new Map([...block.matchAll(/(--color-[a-z-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]))

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}
const v = (name: string) => (name.startsWith("#") ? name : tokens.get(`--color-${name}`) ?? "(thiếu)")

describe("preset ALG — màu thương hiệu", () => {
  it("dùng đúng màu chính, nền và chữ của brand kit", () => {
    expect(v("primary")).toBe("#133D31")
    expect(v("bg")).toBe("#F0EFEF")
    expect(v("text")).toBe("#242C28")
    expect(v("danger")).toBe("#9C3740")
    expect(v("warning")).toBe("#E7C447")
    expect(v("success-border")).toBe("#93A87C")
    expect(v("info-border")).toBe("#9DB4D4")
  })

  const pairs: Array<[string, string]> = [
    ["text", "bg"], ["text", "surface"], ["text", "surface-alt"],
    ["text-muted", "bg"], ["text-muted", "surface"], ["text-muted", "surface-alt"],
    ["primary", "surface"], ["primary", "bg"], ["primary", "primary-muted"], ["#FFFFFF", "primary"],
    ["secondary-text", "surface"], ["secondary-text", "bg"], ["accent-text", "accent-bg"],
    ["text", "warning"], ["warning-text", "warning-bg"], ["warning-text", "surface"],
    ["danger", "surface"], ["danger", "bg"], ["#FFFFFF", "danger"], ["danger-text", "danger-bg"],
    ["success", "surface"], ["success", "bg"], ["#FFFFFF", "success"], ["success-text", "success-bg"],
    ["info", "surface"], ["info", "bg"], ["#FFFFFF", "info"], ["info-text", "info-bg"],
    ["selected-text", "selected"],
  ]
  for (const [fg, bg] of pairs) {
    it(`${fg} trên ${bg} ≥ 4,5:1`, () => {
      expect(contrast(v(fg), v(bg))).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe("phông Google Sans", () => {
  it("tự lưu woff2 kèm giấy phép SIL OFL", () => {
    const dir = join(root, "src/app/fonts/google-sans")
    expect(existsSync(join(dir, "GoogleSans-Variable.woff2"))).toBe(true)
    expect(existsSync(join(dir, "GoogleSans-Italic-Variable.woff2"))).toBe(true)
    expect(readFileSync(join(dir, "OFL.txt"), "utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1")
  })

  it("layout gốc nạp phông qua next/font/local, không gọi CDN", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8")
    expect(layout).toContain('from "next/font/local"')
    expect(layout).toContain("GoogleSans-Variable.woff2")
    // className đặt font-family trên body; chỉ biến --font-sans thì html vẫn giữ chuỗi gốc của @theme
    expect(layout).toContain("${googleSans.className}")
    expect(layout).not.toContain("next/font/google")
    expect(layout).toContain('data-theme="alg"')
  })
})
