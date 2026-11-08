/**
 * Logo SVG tất định cho Bộ nhận diện (PO 08/11/2026 chọn SVG dựng theo mẫu, không gọi AI sinh ảnh).
 * Cùng đầu vào → cùng logo; tên cửa hàng luôn được thoát ký tự XML. Thuần — không import hạ tầng.
 */
import type { BrandPalette, LogoLayout } from "./brand-styles"
import { readableTextOn } from "./color-math"

export interface LogoInput {
  readonly name: string
  readonly initials: string
  readonly palette: BrandPalette
  readonly fontHeading: string
  readonly layout: LogoLayout
}

const SERIF_FONTS = new Set(["Playfair Display", "Lora", "Merriweather", "Cormorant Garamond"])

export function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;")
}

export function fontStack(font: string): string {
  const safe = font.replace(/[^\p{L}\p{N} ]/gu, "")
  return `'${safe}', ${SERIF_FONTS.has(font) ? "Georgia, 'Times New Roman', serif" : "'Helvetica Neue', Arial, sans-serif"}`
}

/** Tách tên dài thành tối đa 2 dòng tại khoảng trắng gần giữa nhất. */
export function splitName(name: string, maxLine = 16): string[] {
  const t = name.trim().replace(/\s+/g, " ")
  if (Array.from(t).length <= maxLine || !t.includes(" ")) return [t]
  const mid = t.length / 2
  let cut = -1
  for (let i = 0; i < t.length; i++) if (t[i] === " " && (cut < 0 || Math.abs(i - mid) < Math.abs(cut - mid))) cut = i
  return [t.slice(0, cut), t.slice(cut + 1)]
}

/** Cỡ chữ để dòng dài nhất vừa `width` (ước 0.58em mỗi ký tự). */
export function fitFontSize(lines: readonly string[], width: number, max: number, min: number): number {
  const longest = Math.max(1, ...lines.map((l) => Array.from(l).length))
  return Math.max(min, Math.min(max, Math.floor(width / (longest * 0.58))))
}

function nameBlock(lines: readonly string[], cx: number, top: number, size: number, color: string, font: string): string {
  return lines
    .map((l, i) => `<text x="${cx}" y="${top + i * size * 1.15}" text-anchor="middle" font-family="${escapeXml(font)}" font-size="${size}" font-weight="700" fill="${color}">${escapeXml(l)}</text>`)
    .join("")
}

/** Phần biểu tượng (không có tên) — dùng lại ở ảnh bìa và danh thiếp. */
export function logoMark(input: Pick<LogoInput, "initials" | "palette" | "fontHeading" | "layout">, cx: number, cy: number, r: number): string {
  const { palette: p, initials } = input
  const font = escapeXml(fontStack(input.fontHeading))
  const ink = readableTextOn(p.primary)
  const size = Math.round(r * (Array.from(initials).length > 1 ? 0.78 : 0.95))
  const letters = `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="${font}" font-size="${size}" font-weight="700" fill="${ink}">${escapeXml(initials)}</text>`
  if (input.layout === "BADGE") {
    const s = r * 2
    return `<rect x="${cx - r}" y="${cy - r}" width="${s}" height="${s}" rx="${Math.round(r * 0.42)}" fill="${p.primary}"/>` +
      `<circle cx="${cx + r * 0.72}" cy="${cy - r * 0.72}" r="${Math.round(r * 0.2)}" fill="${p.secondary}"/>` + letters
  }
  if (input.layout === "WORDMARK") {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.primary}"/>` +
      `<path d="M ${cx - r * 0.55} ${cy + r * 0.62} Q ${cx} ${cy + r * 0.95} ${cx + r * 0.55} ${cy + r * 0.62}" stroke="${p.accent}" stroke-width="${Math.max(2, Math.round(r * 0.07))}" fill="none" stroke-linecap="round"/>` + letters
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.primary}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${Math.round(r * 0.86)}" fill="none" stroke="${p.secondary}" stroke-width="${Math.max(2, Math.round(r * 0.05))}"/>` + letters
}

/** Logo vuông 512×512 nền trong suốt: biểu tượng + tên cửa hàng. */
export function buildLogoSvg(input: LogoInput): string {
  const lines = splitName(input.name)
  const font = fontStack(input.fontHeading)
  const p = input.palette
  let body: string
  if (input.layout === "WORDMARK") {
    const size = fitFontSize(lines, 460, 64, 26)
    const top = 300
    body = logoMark(input, 256, 170, 82) +
      nameBlock(lines, 256, top, size, p.text, font) +
      `<rect x="196" y="${top + (lines.length - 1) * size * 1.15 + 22}" width="120" height="4" rx="2" fill="${p.accent}"/>`
  } else {
    const size = fitFontSize(lines, 460, 54, 24)
    body = logoMark(input, 256, 196, 128) + nameBlock(lines, 256, 392, size, p.text, font)
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${body}</svg>`
}
