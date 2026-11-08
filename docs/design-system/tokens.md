# Design Tokens Specification (SSOT)

> **Tự động sinh từ mã nguồn CSS** tại `src/styles/tokens/*.css`.
> **Quy tắc bất biến:** Không sửa tệp này thủ công. Mọi thay đổi token phải cập nhật trực tiếp vào tệp CSS tương ứng và chạy `npm run gen:tokens-doc`.
> Tuân thủ nghiêm ngặt **ADR-011 (D-UI-01..D-UI-07)**.

---

## Mục lục
- [1. Typography Tokens](#1-typography-tokens)
- [2. Color Tokens (Semantic & Functional)](#2-color-tokens-semantic-functional-)
- [3. Radius Tokens](#3-radius-tokens)
- [4. Shadow & Elevation Tokens](#4-shadow-elevation-tokens)
- [5. Z-Index Layering Tokens](#5-z-index-layering-tokens)
- [6. Motion & Transition Tokens](#6-motion-transition-tokens)
- [7. Spacing & Layout Tokens](#7-spacing-layout-tokens)
- [8. Density Modes](#8-density-modes)
- [9. Multi-Theme Presets](#9-multi-theme-presets)

---

## 1. Typography Tokens

> **Tệp nguồn:** `src/styles/tokens/typography.css`  
> Hệ thống thang cỡ chữ, độ đậm, khoảng cách dòng và họ phông chữ (ADR-011 D-UI-05).

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--font-sans` | `"Be Vietnam Pro", ui-sans-serif, system-ui, sans-serif` | — |
| `--font-serif` | `"Playfair Display", Georgia, Cambria, serif` | — |
| `--font-display` | `"Fraunces", "Playfair Display", Georgia, serif` | — |
| `--font-cursive` | `"Caveat", "Dancing Script", cursive` | — |
| `--text-caption` | `11px` | — |
| `--text-caption--line-height` | `1.35` | — |
| `--text-meta` | `12px` | — |
| `--text-meta--line-height` | `1.4` | — |
| `--text-body-sm` | `13px` | — |
| `--text-body-sm--line-height` | `1.5` | — |
| `--text-body` | `13.5px` | — |
| `--text-body--line-height` | `1.5` | — |
| `--text-title-sm` | `14.5px` | — |
| `--text-title-sm--line-height` | `1.4` | — |
| `--text-title` | `17px` | — |
| `--text-title--line-height` | `1.3` | — |
| `--text-display` | `20px` | — |
| `--text-display--line-height` | `1.25` | — |
| `--text-display-lg` | `22px` | — |
| `--text-display-lg--line-height` | `1.2` | — |
| `--text-display-xl` | `26px` | — |
| `--text-display-xl--line-height` | `1.15` | — |


## 2. Color Tokens (Semantic & Functional)

> **Tệp nguồn:** `src/styles/tokens/color.css`  
> Bộ màu ngữ nghĩa (primary, surface, border, text, warning, danger, success, info) và 12 thang màu alias.

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--color-primary` | `#7A2E42` | — |
| `--color-primary-dark` | `#57202F` | — |
| `--color-primary-foreground` | `#FFFFFF` | — |
| `--color-primary-fg` | `#FFFFFF` | Alias tương thích (ADR-011 D-UI-07, F1-07) |
| `--color-secondary` | `#9CAF88` | — |
| `--color-secondary-text` | `#52643F` | — |
| `--color-accent` | `#C89B3C` | — |
| `--color-accent-text` | `#6B4F1A` | — |
| `--color-bg` | `#FBF6F2` | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-surface-alt` | `#F5ECE4` | — |
| `--color-border` | `#E7DCD0` | — |
| `--color-text` | `#2A1E22` | — |
| `--color-text-muted` | `#746364` | — |
| `--color-selected` | `#F5ECE4` | — |
| `--color-selected-text` | `#7A2E42` | — |
| `--color-warning` | `#C97A2E` | — |
| `--color-warning-bg` | `#FBF1E4` | — |
| `--color-warning-text` | `#8A4807` | — |
| `--color-warning-border` | `#F0D9B5` | — |
| `--color-danger` | `#C4463D` | — |
| `--color-danger-bg` | `#FBEBE9` | — |
| `--color-danger-text` | `#7A2420` | — |
| `--color-danger-border` | `#F5C6C2` | — |
| `--color-success` | `#52643F` | — |
| `--color-success-bg` | `#EAF0E6` | — |
| `--color-success-text` | `#3A4A2C` | — |
| `--color-success-border` | `#C6D9BC` | — |
| `--color-info` | `#1D4ED8` | — |
| `--color-info-bg` | `#EFF6FF` | — |
| `--color-info-text` | `#1E3A5F` | — |
| `--color-info-border` | `#BFDBFE` | — |
| `--color-guidance` | `#B91C1C` | — |
| `--color-guidance-text` | `#450A0A` | — |
| `--color-guidance-bg` | `#FEF2F2` | — |
| `--color-guidance-border` | `#FCA5A5` | — |
| `--color-guidance-tag-bg` | `#FEE2E2` | — |
| `--color-primary-muted` | `#F5E6EA` | — |
| `--color-primary-border` | `#E0B4C0` | — |
| `--color-accent-bg` | `#FBF5E9` | — |
| `--color-accent-border` | `#E8D5A8` | — |
| `--color-tone-plum` | `#7A2E42` | — |
| `--color-tone-rose` | `#A8445D` | — |
| `--color-tone-orange` | `#B93B0B` | — |
| `--color-tone-amber` | `#A04A06` | — |
| `--color-tone-teal` | `#0F766E` | — |
| `--color-tone-blue` | `#1D4ED8` | — |
| `--color-tone-indigo` | `#4338CA` | — |
| `--color-tone-green` | `#15803D` | — |
| `--color-tone-pink` | `#BE185D` | — |
| `--color-tone-emerald` | `#047857` | — |
| `--color-chart-1` | `#2563EB` | — |
| `--color-chart-2` | `#059669` | — |
| `--color-chart-3` | `#EA580C` | — |
| `--color-chart-4` | `#7C3AED` | — |
| `--color-chart-5` | `#E11D48` | — |
| `--color-chart-6` | `#0891B2` | — |
| `--color-chart-7` | `#D97706` | — |
| `--color-chart-8` | `#4F46E5` | — |
| `--color-linkedin` | `#0A66C2` | — |
| `--color-facebook` | `#1877F2` | — |
| `--color-zalo` | `#0068FF` | — |
| `--color-zalo-bg` | `#EEF2F8` | — |
| `--color-tiktok-grad` | `#00f2fe` | — |
| `--color-flora-green` | `#174C3C` | — |
| `--color-flora-sage` | `#5F9670` | — |
| `--color-flora-petal` | `#E48692` | — |
| `--color-flora-leaf` | `#EEF4EE` | — |
| `--color-gold` | `#C89B3C` | — |
| `--color-sage-bg` | `#F4F7F2` | — |
| `--color-background` | `var(--color-bg)` | — |
| `--color-foreground` | `var(--color-text)` | — |
| `--color-input` | `var(--color-border)` | — |
| `--color-muted-foreground` | `var(--color-text-muted)` | — |
| `--color-card` | `var(--color-surface)` | — |
| `--color-card-foreground` | `var(--color-text)` | — |
| `--color-popover` | `var(--color-surface)` | — |
| `--color-popover-foreground` | `var(--color-text)` | — |
| `--color-destructive` | `var(--color-danger)` | — |
| `--color-destructive-foreground` | `#FFFFFF` | — |
| `--color-ring` | `var(--color-primary)` | — |


## 3. Radius Tokens

> **Tệp nguồn:** `src/styles/tokens/radius.css`  
> Hệ thống bo góc component và semantic radius (card, button, dialog).

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--radius-sm` | `0.375rem` | — |
| `--radius-md` | `0.5rem` | — |
| `--radius-lg` | `0.75rem` | — |
| `--radius-xl` | `1rem` | — |
| `--radius-2xl` | `1.25rem` | — |
| `--radius-3xl` | `1.5rem` | — |
| `--radius-full` | `9999px` | — |
| `--radius-card` | `1rem` | — |
| `--radius-button` | `0.75rem` | — |
| `--radius-dialog` | `1rem` | — |


## 4. Shadow & Elevation Tokens

> **Tệp nguồn:** `src/styles/tokens/shadow.css`  
> Hệ thống đổ bóng phân tầng theo độ nổi xúc giác.

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--shadow-subtle` | `0 1px 2px 0 rgba(0, 0, 0, 0.05)` | — |
| `--shadow-card` | `0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)` | — |
| `--shadow-dialog` | `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)` | — |
| `--shadow-floating` | `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)` | — |


## 5. Z-Index Layering Tokens

> **Tệp nguồn:** `src/styles/tokens/z-index.css`  
> Thang thứ tự lớp xếp chồng phân cấp rõ ràng từ nền đến tooltip.

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--z-base` | `0` | — |
| `--z-sticky` | `20` | — |
| `--z-nav` | `30` | — |
| `--z-floating` | `40` | — |
| `--z-overlay` | `50` | — |
| `--z-toast` | `60` | — |
| `--z-tooltip` | `70` | — |


## 6. Motion & Transition Tokens

> **Tệp nguồn:** `src/styles/tokens/motion.css`  
> Thời lượng, gia tốc và cưỡng chế prefers-reduced-motion (WCAG 2.3.3).

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--duration-fast` | `150ms` | — |
| `--duration-normal` | `250ms` | — |
| `--duration-slow` | `350ms` | — |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | — |
| `--ease-in` | `cubic-bezier(0.3, 0, 1, 1)` | — |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | — |


## 7. Spacing & Layout Tokens

> **Tệp nguồn:** `src/styles/tokens/spacing.css`  
> Khoảng cách ngữ nghĩa khu vực, độ cao điều khiển và độ rộng khung hình.

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--space-section` | `2rem` | — |
| `--space-card` | `1.25rem` | — |
| `--control-h-sm` | `2rem` | 32px - density compact |
| `--control-h-md` | `2.5rem` | 40px |
| `--control-h-lg` | `2.75rem` | 44px - touch target sàn |
| `--layout-max-narrow` | `48rem` | 768px - D/F max-w-3xl |
| `--layout-max-medium` | `64rem` | 1024px - A/C max-w-5xl |
| `--layout-max-wide` | `72rem` | 1152px - B/E max-w-6xl |


## 8. Density Modes

> **Tệp nguồn:** `src/styles/tokens/density.css`  
> Hai chế độ mật độ: Compact (vận hành/kho/kế toán) và Comfortable (tiêu chuẩn mặc định).

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--table-py` | `0.375rem` | — |
| `--table-px` | `0.75rem` | — |
| `--card-padding` | `0.875rem` | — |
| `--form-field-gap` | `0.5rem` | — |
| `--table-py` | `0.75rem` | — |
| `--table-px` | `1rem` | — |
| `--card-padding` | `1.25rem` | — |
| `--form-field-gap` | `0.75rem` | — |


## 9. Multi-Theme Presets

> **Tệp nguồn:** `src/styles/tokens/themes.css`  
> 3 bộ giao diện chuẩn hóa: Mộc Lan Artisan, Modern Enterprise Slate, và Minimal Pure Swiss.

| Token CSS | Giá trị mẫu | Ghi chú & Ứng dụng |
|---|---|---|
| `--color-primary` | `#7A2E42` | — |
| `--color-primary-dark` | `#57202F` | — |
| `--color-primary-muted` | `#F5E6EA` | — |
| `--color-primary-border` | `#E0B4C0` | — |
| `--color-secondary` | `#9CAF88` | — |
| `--color-secondary-text` | `#52643F` | — |
| `--color-accent` | `#C89B3C` | — |
| `--color-accent-bg` | `#FBF5E9` | — |
| `--color-accent-text` | `#6B4F1A` | — |
| `--color-bg` | `#FBF6F2` | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-surface-alt` | `#F5ECE4` | — |
| `--color-border` | `#E7DCD0` | — |
| `--color-text` | `#2A1E22` | — |
| `--color-text-muted` | `#746364` | — |
| `--color-selected` | `#F5ECE4` | — |
| `--color-selected-text` | `#7A2E42` | — |
| `--radius-card` | `1rem` | — |
| `--radius-button` | `0.75rem` | — |
| `--radius-dialog` | `1rem` | — |
| `--color-primary` | `#1554E0` | ≥4,54:1 trên nền primary/10–15% (#2563EB chỉ 3,85–4,48:1 < AA) |
| `--color-primary-dark` | `#1D4ED8` | — |
| `--color-primary-muted` | `#EFF6FF` | — |
| `--color-primary-border` | `#BFDBFE` | — |
| `--color-secondary` | `#475569` | — |
| `--color-secondary-text` | `#334155` | — |
| `--color-accent` | `#EA580C` | — |
| `--color-accent-bg` | `#FFF7ED` | — |
| `--color-accent-text` | `#9A3412` | — |
| `--color-bg` | `#F8FAFC` | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-surface-alt` | `#F1F5F9` | — |
| `--color-border` | `#E2E8F0` | — |
| `--color-text` | `#0F172A` | — |
| `--color-text-muted` | `#5D6C81` | 4,88:1 trên surface-alt (#64748B chỉ 4,34:1 < AA) |
| `--color-selected` | `#EFF6FF` | — |
| `--color-selected-text` | `#1554E0` | — |
| `--radius-card` | `0.75rem` | — |
| `--radius-button` | `0.5rem` | — |
| `--radius-dialog` | `0.75rem` | — |
| `--color-primary` | `#18181B` | — |
| `--color-primary-dark` | `#09090B` | — |
| `--color-primary-muted` | `#F4F4F5` | — |
| `--color-primary-border` | `#E4E4E7` | — |
| `--color-secondary` | `#71717A` | — |
| `--color-secondary-text` | `#52525B` | — |
| `--color-accent` | `#059669` | — |
| `--color-accent-bg` | `#ECFDF5` | — |
| `--color-accent-text` | `#047857` | — |
| `--color-bg` | `#FAFAFA` | — |
| `--color-surface` | `#FFFFFF` | — |
| `--color-surface-alt` | `#F4F4F5` | — |
| `--color-border` | `#E4E4E7` | — |
| `--color-text` | `#09090B` | — |
| `--color-text-muted` | `#696971` | 4,95:1 trên surface-alt (#71717A chỉ 4,40:1 < AA) |
| `--color-selected` | `#F4F4F5` | — |
| `--color-selected-text` | `#18181B` | — |
| `--radius-card` | `0.25rem` | — |
| `--radius-button` | `0.25rem` | — |
| `--radius-dialog` | `0.375rem` | — |

---
*Tài liệu tự động cập nhật bởi `scripts/gen-design-tokens-doc.ts` vào CI pipeline.*
