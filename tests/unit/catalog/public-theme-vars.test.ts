import { describe, expect, it } from "vitest"
import { publicThemeVars } from "@/components/catalog/public/public-theme-vars"
import { CATALOG_STYLES } from "@/modules/catalog-studio/domain/styles/style-registry"

/** Trang khách xem phải theo màu phong cách catalog, không theo màu giao diện quản trị. */
describe("publicThemeVars", () => {
  it("ánh xạ biến màu ngữ nghĩa sang token phong cách", () => {
    for (const style of Object.values(CATALOG_STYLES)) {
      const vars = publicThemeVars(style) as Record<string, string>
      expect(vars["--color-primary"]).toBe(style.tokens.ctaBg)
      expect(vars["--color-text"]).toBe(style.tokens.textPrimary)
      expect(vars["--color-text-muted"]).toBe(style.tokens.textSecondary)
      expect(vars["--color-surface"]).toBe(style.tokens.cardBg)
    }
  })
})
