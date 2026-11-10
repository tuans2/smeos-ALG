// Bộ nhận diện thương hiệu AVI LOTUS GROUP (ALG) — áp riêng cho 2 chứng từ xuất ra
// ngoài hệ thống (Thẻ sản phẩm gửi đối tác T02, Thẻ Gia Công gửi thợ/xưởng T07) theo
// yêu cầu PO. KHÔNG đổi design token toàn cục (src/styles/tokens/) — phạm vi chỉ 2
// template này + 2 file con BOM của chúng, nên bảng màu khai riêng tại đây.
// Nguồn: bộ brand kit ALG (logo .ai, bảng màu, font) do PO cung cấp.

import type React from "react"

function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const PRIMARY = "#133d31" // Botanical Garden — màu chủ đạo
const PRIMARY_DARK = "#0c2920" // sắc tối hơn dùng cho gradient/hover
const CREAM = "#f0efef" // Wispy Clouds — nền phụ sáng
const SAGE = "#93a87c" // Forest Shade
const GOLD = "#e7c447" // Yellow Balloon
const GOLD_TEXT = "#7a5a0f" // sắc vàng đậm, đủ tương phản khi làm chữ trên nền vàng nhạt
const PINK = "#f3bfc3" // Pinkesque
const PINK_TEXT = "#9c3740" // dùng luôn Brick Red làm chữ trên nền hồng (đủ tương phản)
const BRICK = "#9c3740" // Brick Red
const BLUE = "#9db4d4" // Powder Blue
const BLUE_TEXT = "#2b4a63" // sắc xanh đậm, đủ tương phản khi làm chữ trên nền xanh nhạt
const INK = "#242c28" // Jet Set — màu chữ chính
const INK_MUTED = "#5c655f"

export const AVI_LOTUS_BRAND_VARS = {
  "--avi-primary": PRIMARY,
  "--avi-primary-dark": PRIMARY_DARK,
  "--avi-primary-05": hexToRgba(PRIMARY, 0.05),
  "--avi-primary-10": hexToRgba(PRIMARY, 0.1),
  "--avi-primary-15": hexToRgba(PRIMARY, 0.15),
  "--avi-primary-20": hexToRgba(PRIMARY, 0.2),
  "--avi-primary-30": hexToRgba(PRIMARY, 0.3),
  "--avi-cream": CREAM,
  "--avi-sage": SAGE,
  "--avi-sage-10": hexToRgba(SAGE, 0.1),
  "--avi-sage-15": hexToRgba(SAGE, 0.15),
  "--avi-sage-40": hexToRgba(SAGE, 0.4),
  "--avi-gold": GOLD,
  "--avi-gold-10": hexToRgba(GOLD, 0.15),
  "--avi-gold-30": hexToRgba(GOLD, 0.35),
  "--avi-gold-text": GOLD_TEXT,
  "--avi-pink": PINK,
  "--avi-pink-25": hexToRgba(PINK, 0.3),
  "--avi-pink-text": PINK_TEXT,
  "--avi-brick": BRICK,
  "--avi-brick-10": hexToRgba(BRICK, 0.1),
  "--avi-brick-15": hexToRgba(BRICK, 0.15),
  "--avi-brick-25": hexToRgba(BRICK, 0.25),
  "--avi-blue": BLUE,
  "--avi-blue-15": hexToRgba(BLUE, 0.18),
  "--avi-blue-text": BLUE_TEXT,
  "--avi-ink": INK,
  "--avi-ink-muted": INK_MUTED,
  "--avi-ink-08": hexToRgba(INK, 0.08),
  "--avi-ink-15": hexToRgba(INK, 0.15),
} as React.CSSProperties

/** 2 lockup (ngang/dọc) × 2 sắc (đảo trắng cho nền đậm / đậm cho nền sáng) + biểu tượng rời. */
export const AVI_LOTUS_LOGO = {
  horizontalDark: "/brand/avi-lotus/logo-horizontal-dark.png",
  horizontalWhite: "/brand/avi-lotus/logo-horizontal-white.png",
  verticalDark: "/brand/avi-lotus/logo-vertical-dark.png",
  verticalWhite: "/brand/avi-lotus/logo-vertical-white.png",
  iconDark: "/brand/avi-lotus/icon-dark.png",
  iconWhite: "/brand/avi-lotus/icon-white.png",
}
