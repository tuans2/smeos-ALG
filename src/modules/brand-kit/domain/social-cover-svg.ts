/**
 * Ảnh bìa mạng xã hội 1640×624 (gấp đôi khung 820×312 của trang Facebook) dựng từ Bộ nhận diện và Hồ sơ.
 * Dải giữa an toàn cho ảnh đại diện che góc trái trên điện thoại. Thuần — không import hạ tầng.
 */
import type { BrandPalette, LogoLayout } from "./brand-styles"
import { readableTextOn, rotateHue } from "./color-math"
import { escapeXml, fitFontSize, fontStack, logoMark, splitName } from "./logo-svg"

export const SOCIAL_COVER_SIZE = { width: 1640, height: 624 } as const

export interface SocialCoverInput {
  readonly name: string
  readonly initials: string
  readonly slogan: string
  readonly palette: BrandPalette
  readonly fontHeading: string
  readonly fontBody: string
  readonly layout: LogoLayout
  /** Một dòng liên hệ ngắn (số điện thoại · địa chỉ) — bỏ trống thì không vẽ */
  readonly contactLine: string | null
}

export function buildSocialCoverSvg(input: SocialCoverInput): string {
  const { width: W, height: H } = SOCIAL_COVER_SIZE
  const p = input.palette
  const ink = readableTextOn(p.primary)
  const heading = escapeXml(fontStack(input.fontHeading))
  const body = escapeXml(fontStack(input.fontBody))
  const lines = splitName(input.name, 22)
  const size = fitFontSize(lines, 900, 104, 56)
  const textX = 640
  const nameTop = lines.length > 1 ? 230 : 280
  const nameSvg = lines
    .map((l, i) => `<text x="${textX}" y="${nameTop + i * size * 1.1}" font-family="${heading}" font-size="${size}" font-weight="700" fill="${ink}">${escapeXml(l)}</text>`)
    .join("")
  const sloganY = nameTop + (lines.length - 1) * size * 1.1 + 78
  const contact = input.contactLine
    ? `<text x="${textX}" y="${sloganY + 70}" font-family="${body}" font-size="30" fill="${ink}" fill-opacity="0.85">${escapeXml(input.contactLine)}</text>`
    : ""
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.primary}"/><stop offset="1" stop-color="${rotateHue(p.primary, 18)}"/></linearGradient></defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    `<circle cx="${W - 120}" cy="80" r="220" fill="${p.secondary}" fill-opacity="0.22"/>` +
    `<circle cx="${W - 300}" cy="${H - 40}" r="150" fill="${p.accent}" fill-opacity="0.2"/>` +
    `<circle cx="380" cy="${H / 2}" r="190" fill="${p.background}" fill-opacity="0.12"/>` +
    logoMark({ initials: input.initials, palette: p, fontHeading: input.fontHeading, layout: input.layout }, 380, H / 2, 150) +
    nameSvg +
    `<text x="${textX}" y="${sloganY}" font-family="${body}" font-size="40" font-style="italic" fill="${ink}">${escapeXml(input.slogan)}</text>` +
    `<rect x="${textX}" y="${sloganY + 22}" width="140" height="5" rx="2.5" fill="${p.secondary}"/>` +
    contact +
    `</svg>`
}
