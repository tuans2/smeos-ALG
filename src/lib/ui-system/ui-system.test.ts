import { describe, it, expect } from "vitest"
import { getUiPreset, UI_PRESETS, DEFAULT_UI_CONFIG } from "./presets"
import { DENSITY_CONFIG } from "./tokens"

describe("UI System Presets & Foundation", () => {
  it("defaults to alg (AVI Lotus Group) preset with comfortable density", () => {
    expect(DEFAULT_UI_CONFIG.preset).toBe("alg")
    expect(DEFAULT_UI_CONFIG.density).toBe("comfortable")
    expect(DEFAULT_UI_CONFIG.colorMode).toBe("light")
  })

  it("returns alg preset for unknown or null ids", () => {
    const fallback = getUiPreset("non-existent-preset")
    expect(fallback.id).toBe("alg")
    expect(fallback.isDefault).toBe(true)

    const nullFallback = getUiPreset(null)
    expect(nullFallback.id).toBe("alg")
  })

  it("resolves clean-blue alias to modern-slate", () => {
    const alias = getUiPreset("clean-blue")
    expect(alias.id).toBe("modern-slate")
  })

  it("registers exactly 4 official presets with complete token definitions", () => {
    const presetIds = ["alg", "moc-lan", "modern-slate", "pure-swiss"]
    expect(Object.keys(UI_PRESETS)).toEqual(presetIds)

    for (const id of presetIds) {
      const preset = UI_PRESETS[id as keyof typeof UI_PRESETS]
      expect(preset).toBeDefined()
      expect(preset.id).toBe(id)
      expect(preset.tokens.primary).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.bg).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.surface).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.tokens.text).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(preset.radius.card).toBeDefined()
      expect(preset.radius.button).toBeDefined()
      expect(preset.radius.dialog).toBeDefined()
    }
  })

  it("provides density configurations for compact and comfortable (pruned spacious)", () => {
    expect(Object.keys(DENSITY_CONFIG)).toEqual(["compact", "comfortable"])
    expect("spacious" in DENSITY_CONFIG).toBe(false)
  })
})

describe("UiSystemProvider — theo dõi DOM chỉ ở môi trường dev", () => {
  it("effect MutationObserver thoát sớm ở production", async () => {
    const { readFileSync } = await import("node:fs")
    const path = await import("node:path")
    const src = readFileSync(path.resolve(__dirname, "ui-provider.tsx"), "utf-8")
    const guard = src.indexOf('if (process.env.NODE_ENV === "production") return')
    const observer = src.indexOf("new MutationObserver(")
    expect(guard).toBeGreaterThan(-1)
    expect(observer).toBeGreaterThan(guard)
    // Chốt nằm trong cùng effect với observer, không phải một effect khác phía trên.
    expect(src.slice(guard, observer)).not.toContain("useEffect(")
  })
})
