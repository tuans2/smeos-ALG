import type { CSSProperties } from "react"
import type { StyleDefinition } from "@/modules/catalog-studio/domain/entities/catalog-studio.types"

/**
 * Ghi đè biến màu ngữ nghĩa (`--color-*`) bằng token phong cách catalog cho vùng trang khách xem.
 * Nhờ vậy các khối dùng class ngữ nghĩa (Câu chuyện, Ưu điểm, Hỏi đáp, Form…) đổi theo phong cách tiệm đã chọn
 * thay vì màu giao diện quản trị — không phải sửa từng khối.
 */
export function publicThemeVars(style: StyleDefinition): CSSProperties {
  const t = style.tokens
  return {
    "--color-primary": t.ctaBg,
    "--color-primary-dark": t.ctaBg,
    "--color-primary-foreground": t.ctaText,
    "--color-accent": t.accent,
    "--color-bg": t.background,
    "--color-surface": t.cardBg,
    "--color-surface-alt": t.background,
    "--color-border": t.border,
    "--color-text": t.textPrimary,
    "--color-text-muted": t.textSecondary,
  } as CSSProperties
}
