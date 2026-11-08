/**
 * Phép màu tối thiểu cho Bộ nhận diện (Thương hiệu bước 2): đổi #RRGGBB ↔ HSL để xoay sắc độ bảng màu
 * theo màu sẵn có của cửa hàng và tạo biến thể cho phương án "Tạo thêm". Thuần — không import hạ tầng.
 */

export interface Hsl {
  readonly h: number
  readonly s: number
  readonly l: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Nhận #RGB hoặc #RRGGBB; sai định dạng → null. */
export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const raw = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!
  const r = parseInt(raw.slice(0, 2), 16) / 255
  const g = parseInt(raw.slice(2, 4), 16) / 255
  const b = parseInt(raw.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return { h: h * 60, s, l }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360
  const sat = clamp(s, 0, 1)
  const lig = clamp(l, 0, 1)
  const c = (1 - Math.abs(2 * lig - 1)) * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = lig - c / 2
  const [r, g, b] =
    hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0")
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase()
}

/** Xoay sắc độ một màu `deg` độ, giữ độ bão hoà và độ sáng. */
export function rotateHue(hex: string, deg: number): string {
  const hsl = hexToHsl(hex)
  return hsl ? hslToHex({ ...hsl, h: hsl.h + deg }) : hex
}

/** Độ chênh sắc độ (0–180) giữa hai màu — dùng để xoay cả bảng màu về sắc độ của cửa hàng. */
export function hueDelta(from: string, to: string): number {
  const a = hexToHsl(from)
  const b = hexToHsl(to)
  if (!a || !b) return 0
  return b.h - a.h
}

/** Độ sáng tương đối (WCAG) để chọn chữ trắng/đen đặt lên một nền. */
export function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return 0
  const ch = (i: number) => {
    const v = parseInt(m[1]!.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * ch(0) + 0.7152 * ch(2) + 0.0722 * ch(4)
}

/** Tỉ lệ tương phản WCAG giữa hai màu (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** Chữ đọc được trên nền `bg`: chọn trắng hoặc gần đen, bên nào tương phản cao hơn. */
export function readableTextOn(bg: string): string {
  return contrastRatio(bg, "#1A1A1A") >= contrastRatio(bg, "#FFFFFF") ? "#1A1A1A" : "#FFFFFF"
}
