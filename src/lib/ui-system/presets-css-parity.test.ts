import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { UI_PRESETS } from "./presets"
import { CSS_VARIABLE_MAP, DENSITY_CONFIG } from "./tokens"
import type { UiPresetId } from "./types"

/**
 * SSOT token (ADR-011 D-UI-03/D-UI-04): giá trị giao diện chỉ có hiệu lực từ CSS
 * (`src/styles/tokens/*.css`). `presets.ts` chép lại một phần để UI Studio vẽ mẫu màu
 * và nhãn bo góc — test này bắt bản chép phải bằng đúng giá trị trình duyệt dùng,
 * tức khối `[data-theme="<preset>"]` của `themes.css` nếu có, không thì giá trị gốc `@theme`.
 */
const TOKENS_DIR = path.resolve(__dirname, "../../styles/tokens")
const read = (file: string) => readFileSync(path.join(TOKENS_DIR, file), "utf8")

function declarations(block: string): Map<string, string> {
  const out = new Map<string, string>()
  const body = block.replace(/\/\*[\s\S]*?\*\//g, "")
  for (const m of body.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(m[1]!, m[2]!.trim())
  return out
}

const ROOT = new Map<string, string>()
for (const file of ["color.css", "radius.css", "shadow.css", "typography.css"]) {
  for (const [k, v] of declarations(read(file))) ROOT.set(k, v)
}

const THEMES_CSS = read("themes.css")
function themeBlock(id: UiPresetId): Map<string, string> {
  const m = THEMES_CSS.match(new RegExp(`\\[data-theme="${id}"\\][^{]*\\{([^}]*)\\}`))
  if (!m) throw new Error(`themes.css thiếu khối [data-theme="${id}"]`)
  return declarations(m[1]!)
}

function effective(id: UiPresetId, cssVar: string): string | undefined {
  return themeBlock(id).get(cssVar) ?? ROOT.get(cssVar)
}

const norm = (v: string) => v.replace(/\s+/g, " ").toLowerCase()

describe("presets.ts khớp token CSS (một nguồn sự thật)", () => {
  for (const id of Object.keys(UI_PRESETS) as UiPresetId[]) {
    const preset = UI_PRESETS[id]

    it(`${id}: mọi màu trong preset.tokens bằng giá trị CSS hiệu lực`, () => {
      for (const [key, cssVar] of Object.entries(CSS_VARIABLE_MAP)) {
        const css = effective(id, cssVar)
        expect(css, `CSS thiếu ${cssVar}`).toBeDefined()
        expect(norm(preset.tokens[key as keyof typeof preset.tokens]), `${id}.tokens.${key} ≠ ${cssVar}`).toBe(
          norm(css!),
        )
      }
    })

    it(`${id}: bo góc và bóng đổ bằng giá trị CSS hiệu lực`, () => {
      for (const [key, value] of Object.entries(preset.radius)) {
        expect(norm(value), `${id}.radius.${key}`).toBe(norm(effective(id, `--radius-${key}`) ?? "(thiếu)"))
      }
      for (const [key, value] of Object.entries(preset.shadows)) {
        expect(norm(value), `${id}.shadows.${key}`).toBe(norm(effective(id, `--shadow-${key}`) ?? "(thiếu)"))
      }
    })

    it(`${id}: phông chữ khai trong preset bằng giá trị CSS`, () => {
      expect(norm(preset.fontSans)).toBe(norm(effective(id, "--font-sans") ?? "(thiếu)"))
      if (preset.fontDisplay) {
        expect(norm(preset.fontDisplay)).toBe(norm(effective(id, "--font-display") ?? "(thiếu)"))
      }
    })
  }

  it("mọi khối [data-theme] trong themes.css đều có preset tương ứng (hoặc là bí danh đã biết)", () => {
    const ids = [...THEMES_CSS.matchAll(/\[data-theme="([a-z-]+)"\]/g)].map((m) => m[1]!)
    const known = new Set([...Object.keys(UI_PRESETS), "clean-blue"])
    expect(ids.filter((x) => !known.has(x))).toEqual([])
  })
})

describe("DENSITY_CONFIG khớp density.css", () => {
  const DENSITY_CSS = read("density.css")
  function densityBlock(mode: keyof typeof DENSITY_CONFIG): Map<string, string> {
    const m = DENSITY_CSS.match(new RegExp(`\\[data-density="${mode}"\\][^{]*\\{([^}]*)\\}`))
    if (!m) throw new Error(`density.css thiếu khối [data-density="${mode}"]`)
    return declarations(m[1]!)
  }

  for (const mode of Object.keys(DENSITY_CONFIG) as (keyof typeof DENSITY_CONFIG)[]) {
    it(`${mode}: đệm bảng, đệm thẻ, khoảng cách trường bằng giá trị CSS`, () => {
      const css = densityBlock(mode)
      const cfg = DENSITY_CONFIG[mode]
      expect(cfg.tableCellPadding).toBe(`${css.get("--table-py")} ${css.get("--table-px")}`)
      expect(cfg.cardPadding).toBe(css.get("--card-padding"))
      expect(cfg.formGap).toBe(css.get("--form-field-gap"))
      expect(Object.keys(cfg).sort()).toEqual(["cardPadding", "formGap", "tableCellPadding"])
    })
  }
})
