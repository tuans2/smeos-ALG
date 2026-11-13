/**
 * Danh thiếp cửa hàng (module Thương hiệu) — luật thuần.
 *
 * Mọi dòng trên thẻ lấy từ Hồ sơ cửa hàng; thiếu thì bỏ dòng, không điền mẫu.
 * Mã QR ưu tiên trang chia sẻ cửa hàng (công cụ 11), rồi đến trang web.
 */
import { isValidHexColor } from "./profile-rules"
import { isPlausiblePhone } from "./store-profile-completeness"
import { safeHttpUrl } from "./store-share-page"

/** Khổ danh thiếp phổ biến ở Việt Nam. */
export const BUSINESS_CARD_MM = { width: 90, height: 54 } as const
/** 300 dpi cho bản in: 90 mm ≈ 1063 px, 54 mm ≈ 638 px. */
export const BUSINESS_CARD_PRINT_PX = {
  width: Math.round((BUSINESS_CARD_MM.width / 25.4) * 300),
  height: Math.round((BUSINESS_CARD_MM.height / 25.4) * 300),
} as const

export interface BusinessCardSource {
  readonly business: {
    readonly display_name: string
    readonly phone: string | null
    readonly email: string | null
    readonly address: string | null
    readonly website: string | null
  } | null
  readonly brand: { readonly primary_color: string | null; readonly logo_url: string | null } | null
  /** URL tuyệt đối của trang chia sẻ đang hoạt động, nếu có */
  readonly shareUrl: string | null
}

export type CardLineKind = "PHONE" | "EMAIL" | "ADDRESS" | "WEBSITE"

export interface BusinessCardData {
  readonly name: string
  readonly logoUrl: string | null
  readonly accentColor: string | null
  readonly lines: readonly { readonly kind: CardLineKind; readonly text: string; readonly href?: string }[]
  readonly qr: { readonly url: string; readonly caption: string } | null
  /** Thiếu gì để thẻ dùng được — rỗng là in được */
  readonly blockers: readonly string[]
}

const text = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}

/** Hiển thị trang web gọn trên thẻ: bỏ giao thức, "www." và dấu "/" cuối. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "")
}

export function buildBusinessCard(src: BusinessCardSource): BusinessCardData {
  const b = src.business
  const name = text(b?.display_name)
  const phone = text(b?.phone)
  const email = text(b?.email)
  const address = text(b?.address)
  const website = safeHttpUrl(b?.website)

  const lines: { kind: CardLineKind; text: string; href?: string }[] = []
  if (phone && isPlausiblePhone(phone)) lines.push({ kind: "PHONE", text: phone })
  if (email) lines.push({ kind: "EMAIL", text: email })
  if (address) lines.push({ kind: "ADDRESS", text: address })
  if (website) lines.push({ kind: "WEBSITE", text: displayUrl(website), href: website })

  const share = safeHttpUrl(src.shareUrl)
  const qr = share
    ? { url: share, caption: "Quét để xem cửa hàng" }
    : website
      ? { url: website, caption: "Quét để vào trang web" }
      : null

  const blockers: string[] = []
  if (!name) blockers.push("Tên cửa hàng")
  if (!lines.some((l) => l.kind === "PHONE" || l.kind === "EMAIL")) blockers.push("Số điện thoại hoặc thư điện tử")

  const color = src.brand?.primary_color ?? null
  return {
    name: name ?? "",
    logoUrl: src.brand?.logo_url ?? null,
    accentColor: color && isValidHexColor(color) ? color : null,
    lines,
    qr,
    blockers,
  }
}

/** Thoát ký tự đặc biệt theo vCard 3.0 (RFC 2426 §4). */
function esc(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1")
}

/** Danh bạ điện tử: khách lưu vào điện thoại bằng một chạm. CRLF theo chuẩn. */
export function buildVCard(card: BusinessCardData): string {
  const out = ["BEGIN:VCARD", "VERSION:3.0", `FN:${esc(card.name)}`, `ORG:${esc(card.name)}`]
  for (const l of card.lines) {
    if (l.kind === "PHONE") out.push(`TEL;TYPE=WORK,VOICE:${esc(l.text)}`)
    if (l.kind === "EMAIL") out.push(`EMAIL;TYPE=WORK:${esc(l.text)}`)
    if (l.kind === "ADDRESS") out.push(`ADR;TYPE=WORK:;;${esc(l.text)};;;;`)
    if (l.kind === "WEBSITE" && l.href) out.push(`URL:${esc(l.href)}`)
  }
  if (card.qr && card.qr.url !== card.lines.find((l) => l.kind === "WEBSITE")?.href) {
    out.push(`URL;TYPE=STORE:${esc(card.qr.url)}`)
  }
  out.push("END:VCARD")
  return out.join("\r\n") + "\r\n"
}
