/**
 * UI System Types — smeOS Architecture (Phase 1 — Enterprise Design System)
 *
 * Định nghĩa hợp đồng kiểu dữ liệu cho toàn bộ hệ thống Runtime UI System:
 * - Presets: Mộc Lan (chuẩn StoreOS), Modern Slate (Platform/ChainOS), Pure Swiss (Minimalist)
 * - Density: Compact (kế toán/kho/vận hành), Comfortable (tiêu chuẩn mặc định)
 * - ColorMode: Light (v1 light mode only — ADR-011 D-UI-03)
 */

export type UiPresetId = "alg" | "moc-lan" | "modern-slate" | "pure-swiss"

/** Scope xác định preset này dành cho platform nào */
export type UiPresetScope = "saas-mother" | "chain-store" | "all"

export type UiDensity = "compact" | "comfortable"

export type UiColorMode = "light"

export interface UiSystemConfig {
  preset: UiPresetId
  density: UiDensity
  colorMode: UiColorMode
}

export interface PresetTokenValues {
  primary: string
  primaryDark: string
  primaryMuted: string
  primaryBorder: string
  secondary: string
  secondaryText: string
  accent: string
  accentBg: string
  bg: string
  surface: string
  surfaceAlt: string
  border: string
  text: string
  textMuted: string
  warning: string
  warningBg: string
  danger: string
  dangerBg: string
  success: string
  successBg: string
  info: string
  infoBg: string
  selected: string
  selectedText: string
}

export interface PresetRadiusValues {
  sm: string
  md: string
  lg: string
  card: string
  button: string
  dialog: string
}

export interface PresetDefinition {
  id: UiPresetId
  name: string
  tagline: string
  description: string
  isDefault?: boolean
  /** Platform scope: saas-mother (console /van-hanh), chain-store (ChainOS/StoreOS), all */
  scope: UiPresetScope
  fontSans: string
  fontDisplay?: string
  tokens: PresetTokenValues
  radius: PresetRadiusValues
  shadows: {
    subtle: string
    card: string
    dialog: string
  }
}

export interface UiSystemContextValue {
  config: UiSystemConfig
  currentPreset: PresetDefinition
  /** Tất cả presets có scope phù hợp với platform hiện tại */
  availablePresets: PresetDefinition[]
  setPreset: (preset: UiPresetId) => void
  setDensity: (density: UiDensity) => void
  resetToDefault: () => void
}
