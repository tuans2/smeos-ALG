import { describe, it, expect } from "vitest"
import { resolveUiTheme } from "./resolve-ui-theme"

describe("resolveUiTheme (Server Component Theme Resolution)", () => {
  it("resolves alg (ALG brand, 12/11/2026) and compact density for platform admin", () => {
    const theme = resolveUiTheme({
      organizationType: "PLATFORM",
      roleKey: "platform_admin",
    })
    expect(theme.preset).toBe("alg")
    expect(theme.density).toBe("compact")
    expect(theme.dataTheme).toBe("alg")
    expect(theme.dataDensity).toBe("compact")
    expect(theme.brandStyle).toBeUndefined()
  })

  it("resolves alg and compact density for ChainOS coordinator", () => {
    const theme = resolveUiTheme({
      organizationType: "CHAIN",
      roleKey: "coordinator",
    })
    expect(theme.preset).toBe("alg")
    expect(theme.density).toBe("compact")
  })

  it("resolves alg and comfortable density for default StoreOS", () => {
    const theme = resolveUiTheme({
      organizationType: "STORE",
      roleKey: "dieu_hanh",
    })
    expect(theme.preset).toBe("alg")
    expect(theme.density).toBe("comfortable")
  })

  it("respects organization ui_preset if configured to pure-swiss", () => {
    const theme = resolveUiTheme({
      organizationType: "STORE",
      roleKey: "dieu_hanh",
      organization: {
        settings: {
          ui_preset: "pure-swiss",
        },
      },
    })
    expect(theme.preset).toBe("pure-swiss")
    expect(theme.density).toBe("comfortable")
  })

  it("generates brandStyle CSS variables when ui_brand is set", () => {
    const theme = resolveUiTheme({
      organizationType: "STORE",
      roleKey: "dieu_hanh",
      organization: {
        settings: {
          ui_brand: {
            primary: "#0F766E",
            primaryDark: "#115E59",
            primaryMuted: "#CCFBF1",
            accent: "#F59E0B",
          },
        },
      },
    })
    expect(theme.preset).toBe("alg")
    expect(theme.brandStyle).toEqual({
      "--color-primary": "#0F766E",
      "--color-primary-dark": "#115E59",
      "--color-primary-muted": "#CCFBF1",
      "--color-accent": "#F59E0B",
    })
  })

  it("falls back safely when session is null or undefined", () => {
    const theme = resolveUiTheme(null)
    expect(theme.preset).toBe("alg")
    expect(theme.density).toBe("comfortable")
  })

  it("store can still opt into the previous moc-lan preset via ui_preset", () => {
    const theme = resolveUiTheme({
      organizationType: "STORE",
      organization: { settings: { ui_preset: "moc-lan" } },
    })
    expect(theme.preset).toBe("moc-lan")
  })
})
