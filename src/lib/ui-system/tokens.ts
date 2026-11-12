/**
 * Design Tokens Registry & Mapping — ALG Architecture (Phase 1)
 *
 * Ánh xạ giữa các Design Tokens trừu tượng và CSS Custom Properties.
 * Density: compact và comfortable (ADR-011 D-UI-03: loại bỏ spacious).
 */

export const CSS_VARIABLE_MAP = {
  primary: "--color-primary",
  primaryDark: "--color-primary-dark",
  primaryMuted: "--color-primary-muted",
  primaryBorder: "--color-primary-border",
  secondary: "--color-secondary",
  secondaryText: "--color-secondary-text",
  accent: "--color-accent",
  accentBg: "--color-accent-bg",
  bg: "--color-bg",
  surface: "--color-surface",
  surfaceAlt: "--color-surface-alt",
  border: "--color-border",
  text: "--color-text",
  textMuted: "--color-text-muted",
  warning: "--color-warning",
  warningBg: "--color-warning-bg",
  danger: "--color-danger",
  dangerBg: "--color-danger-bg",
  success: "--color-success",
  successBg: "--color-success-bg",
  info: "--color-info",
  infoBg: "--color-info-bg",
  selected: "--color-selected",
  selectedText: "--color-selected-text",
} as const

/**
 * Bản chép giá trị density của `src/styles/tokens/density.css` — CSS là giá trị có hiệu lực.
 * Chỉ giữ khoá CSS thật sự định nghĩa (density không đổi chiều cao hàng bảng hay nút).
 * `presets-css-parity.test.ts` đỏ nếu hai nơi lệch nhau.
 */
export const DENSITY_CONFIG = {
  compact: {
    tableCellPadding: "0.375rem 0.75rem", // --table-py --table-px
    cardPadding: "0.875rem", // --card-padding
    formGap: "0.5rem", // --form-field-gap
  },
  comfortable: {
    tableCellPadding: "0.75rem 1rem",
    cardPadding: "1.25rem",
    formGap: "0.75rem",
  },
} as const
