/**
 * Trang hồ sơ cửa hàng chia sẻ nhanh (công cụ 11) — luật thuần.
 *
 * Chỉ hiện dữ liệu thật của Hồ sơ cửa hàng: thiếu trường nào thì ẩn khối đó,
 * không điền số/địa chỉ mẫu (OPERATING_PRINCIPLES §2).
 */
import { generateAutoSlug } from "@/modules/catalog-links/domain/catalog-link-rules"
import { isValidHexColor } from "./profile-rules"
import { isPlausiblePhone } from "./store-profile-completeness"

export const STORE_SHARE_PATH = "/ch"

export function generateStoreShareSlug(storeName: string): string {
  return generateAutoSlug(storeName)
}

export interface StoreShareLinkView {
  readonly slug: string
  readonly path: string
  readonly view_count: number
  readonly created_at: string
}

export type ContactAction =
  | { readonly kind: "CALL"; readonly label: string; readonly href: string }
  | { readonly kind: "ZALO"; readonly label: string; readonly href: string }
  | { readonly kind: "DIRECTIONS"; readonly label: string; readonly href: string }
  | { readonly kind: "EMAIL"; readonly label: string; readonly href: string }
  | { readonly kind: "WEBSITE"; readonly label: string; readonly href: string }

export interface SocialLink {
  readonly network: string
  readonly label: string
  readonly href: string
}

export interface PublicStoreProfile {
  readonly name: string
  readonly description: string | null
  readonly address: string | null
  readonly phone: string | null
  readonly logoUrl: string | null
  readonly primaryColor: string | null
  readonly hours: string | null
  readonly actions: readonly ContactAction[]
  readonly socials: readonly SocialLink[]
}

export interface PublicStoreSource {
  readonly orgName: string
  readonly business: {
    readonly display_name: string
    readonly phone: string | null
    readonly email: string | null
    readonly address: string | null
    readonly website: string | null
    readonly description: string | null
    readonly social_links: unknown
    readonly operating_hours: unknown
  } | null
  readonly primaryColor: string | null
  readonly logoUrl: string | null
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: "Facebook", zalo: "Zalo", tiktok: "TikTok", instagram: "Instagram",
  youtube: "YouTube", shopee: "Shopee", website: "Website",
}

const text = (v: string | null | undefined): string | null => {
  const t = v?.trim()
  return t ? t : null
}

/** Chỉ nhận http(s) — chặn `javascript:` và giá trị lạ từ dữ liệu người dùng nhập. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const t = text(raw)
  if (!t) return null
  const withScheme = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withScheme)
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null
  } catch {
    return null
  }
}

export function phoneDigits(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+84/, "0")
}

function hoursText(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const values = Object.values(raw as Record<string, unknown>)
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  return values.length > 0 ? values.join(" · ") : null
}

function socialLinks(raw: unknown): SocialLink[] {
  if (!raw || typeof raw !== "object") return []
  const out: SocialLink[] = []
  for (const [network, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") continue
    const href = safeHttpUrl(value)
    if (!href) continue
    out.push({ network, label: SOCIAL_LABELS[network.toLowerCase()] ?? network, href })
  }
  return out
}

export function buildPublicStoreProfile(src: PublicStoreSource): PublicStoreProfile {
  const b = src.business
  const phone = text(b?.phone)
  const validPhone = phone && isPlausiblePhone(phone) ? phone : null
  const address = text(b?.address)
  const email = text(b?.email)
  const website = safeHttpUrl(b?.website)

  const actions: ContactAction[] = []
  if (validPhone) {
    const digits = phoneDigits(validPhone)
    actions.push({ kind: "CALL", label: "Gọi điện", href: `tel:${digits}` })
    actions.push({ kind: "ZALO", label: "Nhắn Zalo", href: `https://zalo.me/${digits}` })
  }
  if (address) {
    actions.push({
      kind: "DIRECTIONS", label: "Chỉ đường",
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`,
    })
  }
  if (email) actions.push({ kind: "EMAIL", label: "Gửi thư", href: `mailto:${email}` })
  if (website) actions.push({ kind: "WEBSITE", label: "Trang web", href: website })

  return {
    name: text(b?.display_name) ?? src.orgName,
    description: text(b?.description),
    address,
    phone: validPhone,
    logoUrl: src.logoUrl,
    primaryColor: src.primaryColor && isValidHexColor(src.primaryColor) ? src.primaryColor : null,
    hours: hoursText(b?.operating_hours),
    actions,
    socials: socialLinks(b?.social_links),
  }
}
