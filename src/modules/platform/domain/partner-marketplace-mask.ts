/**
 * Che MỘT PHẦN thông tin nhạy cảm của hồ sơ chợ đối tác (PO 01/11/2026): người xem
 * thấy có dữ liệu nhưng không dùng được — SĐT, tên chủ/người liên hệ, số nhà + tên
 * đường, email, mã số thuế, link mạng xã hội / bản đồ. Che ở máy chủ trước khi trả về,
 * nên DevTools cũng không thấy bản gốc. Thuần.
 *
 * Địa chỉ giữ lại quận suy ra từ bản gốc để bộ lọc "Quận / khu vực" vẫn đúng sau khi che.
 */
import { FACET_DEFS, facetValues } from "./partner-marketplace-facets"
import type { PartnerStoreMarketplaceEntity } from "./partner-marketplace.types"

const DOT = "•"
/** Câu trả lời "không có dữ liệu" (Chưa có, Không cung cấp…) giữ nguyên — không có gì để che. */
const EMPTY = /^(|-+|n\/a|ko|k|không\b.*|chưa\b.*)$/i

const blank = (v: string | undefined): boolean => EMPTY.test((v ?? "").trim())

/** `0903456789` → `0903 ••• 789`. Ít hơn 7 chữ số → chỉ giữ 2 số cuối. */
export function maskPhone(phone: string): string {
  if (blank(phone)) return phone
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return `${DOT.repeat(3)}${digits.slice(-2)}`
  return `${digits.slice(0, 4)} ${DOT.repeat(3)} ${digits.slice(-3)}`
}

/** `Nguyễn Văn An` → `Nguyễn V•• A••` — giữ họ, các chữ sau chỉ giữ chữ cái đầu. */
export function maskPersonName(name: string): string {
  if (blank(name)) return name
  const [first, ...rest] = name.trim().split(/\s+/)
  if (rest.length === 0) return `${first!.slice(0, 1)}${DOT.repeat(2)}`
  return [first, ...rest.map((w) => `${w.slice(0, 1)}${DOT.repeat(2)}`)].join(" ")
}

/** `nguyenan@gmail.com` → `ng•••@gmail.com`. */
export function maskEmail(email: string): string {
  if (blank(email)) return email
  const at = email.indexOf("@")
  if (at < 1) return `${email.slice(0, 2)}${DOT.repeat(3)}`
  return `${email.slice(0, Math.min(2, at))}${DOT.repeat(3)}${email.slice(at)}`
}

/** Mã số thuế / mã định danh: giữ 3 ký tự đầu và 2 ký tự cuối. */
export function maskCode(code: string): string {
  if (blank(code)) return code
  const c = code.trim()
  if (c.length <= 5) return `${c.slice(0, 1)}${DOT.repeat(3)}`
  return `${c.slice(0, 3)}${DOT.repeat(c.length - 5)}${c.slice(-2)}`
}

/** Link: giữ tên miền, che đường dẫn — `facebook.com/hoa.an` → `facebook.com/•••`. */
export function maskLink(link: string | undefined): string | undefined {
  if (link === undefined || blank(link)) return link
  const m = link.trim().match(/^(?:https?:\/\/)?(?:www\.)?([^/\s?#]+)/i)
  return m ? `${m[1]}/${DOT.repeat(3)}` : DOT.repeat(3)
}

/**
 * Số nhà và tên đường bị che (chữ số → `••`, mỗi chữ giữ chữ cái đầu); thêm quận suy ra
 * từ bản gốc. `49 nguyễn phong sắc` → `•• n•• p•• s•• · Cầu Giấy`.
 */
export function maskAddress(address: string, districts: readonly string[] = []): string {
  if (blank(address)) return address
  const street = address
    .split(/\s+/)
    .map((w) => (/\d/.test(w) ? DOT.repeat(2) : `${w.slice(0, 1)}${DOT.repeat(2)}`))
    .join(" ")
  const known = districts.filter((d) => d !== "Khác / chưa rõ")
  return known.length ? `${street} · ${known.join(", ")}` : street
}

const DISTRICT_DEF = FACET_DEFS.find((d) => d.kind === "district")!

export function maskMarketplaceStore(store: PartnerStoreMarketplaceEntity): PartnerStoreMarketplaceEntity {
  const { identity, contact, digital } = store
  return {
    ...store,
    identity: {
      ...identity,
      ownerName: maskPersonName(identity.ownerName),
      contactPerson: maskPersonName(identity.contactPerson),
      legalName: identity.legalName === undefined ? undefined : maskPersonName(identity.legalName),
      taxCode: identity.taxCode === undefined ? undefined : maskCode(identity.taxCode),
    },
    contact: {
      phone: maskPhone(contact.phone),
      email: contact.email === undefined ? undefined : maskEmail(contact.email),
      address: maskAddress(contact.address, facetValues(store, DISTRICT_DEF)),
      googleMaps: maskLink(contact.googleMaps),
    },
    digital: {
      ...digital,
      facebook: maskLink(digital.facebook),
      tiktok: maskLink(digital.tiktok),
      website: maskLink(digital.website),
    },
    // Link ảnh gốc trên Drive lộ thư mục khảo sát — ảnh đã có qua URL ký.
    media: { ...store.media, rawImageUrls: undefined },
  }
}
