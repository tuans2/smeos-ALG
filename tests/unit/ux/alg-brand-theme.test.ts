import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Đổi nhận diện ALG mức 3 (12/11/2026): preset `alg` là mặc định; mọi cặp chữ/nền phải đạt WCAG AA.
const root = process.cwd()
const themes = readFileSync(join(root, "src/styles/tokens/themes.css"), "utf8")
const block = themes.match(/\[data-theme="alg"\][^{]*\{([^}]*)\}/)?.[1] ?? ""
const tokens = new Map([...block.matchAll(/(--color-[a-z0-9-]+)\s*:\s*(#[0-9A-Fa-f]{6})\s*;/g)].map((m) => [m[1]!, m[2]!]))

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
    expect(v("danger")).toBe("#97353E") // Brick Red #9C3740 làm đậm tối thiểu để đạt AA trên nền nhạt của chính nó
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
  // Chữ màu trên nền nhạt 10–20% của chính nó (vd `text-success` + `bg-success/15`) — trên nền trắng và nền trang
  const mix = (hex: string, base: string, t: number) =>
    "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * t + parseInt(base.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, "0")).join("")
  const tinted: Array<[string, string]> = [["primary", "primary"], ["success", "success"], ["info", "info"], ["danger", "danger"], ["secondary-text", "secondary"], ["warning-text", "warning"], ["accent-text", "accent"]]
  for (const [fg, tint] of tinted) {
    it(`${fg} trên nền ${tint} nhạt 10–20% ≥ 4,5:1`, () => {
      for (const t of [0.1, 0.15, 0.2]) for (const base of [v("surface"), v("bg")]) {
        expect(contrast(v(fg), mix(v(tint), base, t)), `${fg} / ${tint} ${t * 100}% trên ${base}`).toBeGreaterThanOrEqual(4.5)
      }
    })
  }

  for (const [fg, bg] of pairs) {
    it(`${fg} trên ${bg} ≥ 4,5:1`, () => {
      expect(contrast(v(fg), v(bg))).toBeGreaterThanOrEqual(4.5)
    })
  }
})

describe("preset ALG — màu nhóm và biểu đồ (Đợt 4, D4-18)", () => {
  const mix10 = (hex: string, base: string) =>
    "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * 0.1 + parseInt(base.slice(i, i + 2), 16) * 0.9).toString(16).padStart(2, "0")).join("")
  for (const tone of ["plum", "rose", "orange", "amber", "teal", "blue", "indigo", "green", "pink", "emerald"]) {
    it(`tone-${tone}: icon trắng trên nền đặc và icon màu trên nền nhạt 10% ≥ 4,5:1`, () => {
      const c = v(`tone-${tone}`)
      expect(contrast("#FFFFFF", c)).toBeGreaterThanOrEqual(4.5)
      for (const base of [v("surface"), v("bg")]) expect(contrast(c, mix10(c, base))).toBeGreaterThanOrEqual(4.5)
    })
  }
  for (let n = 1; n <= 8; n++) {
    it(`chart-${n} ≥ 3:1 trên nền thẻ và nền trang`, () => {
      expect(contrast(v(`chart-${n}`), v("surface"))).toBeGreaterThanOrEqual(3)
      expect(contrast(v(`chart-${n}`), v("bg"))).toBeGreaterThanOrEqual(3)
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
