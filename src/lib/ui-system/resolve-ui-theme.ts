import type { CSSProperties } from "react"
import type { UiPresetId, UiDensity } from "./types"

export interface UiThemeSessionLike {
  organizationType?: string | null | undefined
  roleKey?: string | null | undefined
  organization?: {
    industry?: string | null | undefined
    settings?: Record<string, unknown> | null | undefined
  } | null | undefined
}

export interface UiBrandSettings {
  primary?: string | undefined
  primaryDark?: string | undefined
  primaryMuted?: string | undefined
  primaryBorder?: string | undefined
  accent?: string | undefined
}

export interface ResolvedUiTheme {
  preset: UiPresetId
  density: UiDensity
  brandStyle?: CSSProperties | undefined
  dataTheme: UiPresetId
  dataDensity: UiDensity
}

/**
 * Phân giải UI Theme tại máy chủ (Server Component) — ADR-011 D-UI-03 & F1-03.
 *
 * 1. Theme sản phẩm theo tầng (đổi thương hiệu ALG mức 3, 12/11/2026 — chờ PO xác nhận):
 *    - Mọi tầng dùng preset `alg` (bộ nhận diện AVI Lotus Group).
 *    - SaaS Mother (Platform Console / Admin) và ChainOS: mật độ compact.
 *    - StoreOS: comfortable; tổ chức vẫn chọn được preset khác qua `settings.ui_preset`.
 *
 * 2. Nhận diện thương hiệu tổ chức:
 *    - Đọc `organizations.settings.ui_brand` để sinh CSS custom properties đè màu primary/accent.
 */
export function resolveUiTheme(session?: UiThemeSessionLike | null): ResolvedUiTheme {
  let preset: UiPresetId = "alg"
  let density: UiDensity = "comfortable"

  const orgType = session?.organizationType
  const roleKey = session?.roleKey

  if (orgType === "PLATFORM" || roleKey === "platform_admin") {
    density = "compact"
  } else if (orgType === "CHAIN" || roleKey === "coordinator") {
    density = "compact"
  } else {
    // StoreOS hoặc role khác
    const orgSettings = session?.organization?.settings
    if (orgSettings && typeof orgSettings === "object") {
      const configuredPreset = orgSettings["ui_preset"] as string | undefined
      if (configuredPreset === "moc-lan" || configuredPreset === "modern-slate" || configuredPreset === "pure-swiss") {
        preset = configuredPreset
      }
    }
  }

  // Nhận diện thương hiệu tổ chức (ui_brand)
  let brandStyle: CSSProperties | undefined
  const brand = session?.organization?.settings?.["ui_brand"] as UiBrandSettings | undefined

  if (brand && typeof brand === "object" && brand.primary) {
    const styleObj: Record<string, string> = {
      "--color-primary": brand.primary,
    }
    if (brand.primaryDark) {
      styleObj["--color-primary-dark"] = brand.primaryDark
    }
    if (brand.primaryMuted) {
      styleObj["--color-primary-muted"] = brand.primaryMuted
    }
    if (brand.primaryBorder) {
      styleObj["--color-primary-border"] = brand.primaryBorder
    }
    if (brand.accent) {
      styleObj["--color-accent"] = brand.accent
    }
    brandStyle = styleObj as CSSProperties
  }

  return {
    preset,
    density,
    brandStyle,
    dataTheme: preset,
    dataDensity: density,
  }
}

