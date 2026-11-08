/**
 * Một phương án Bộ nhận diện (Thương hiệu bước 2): bảng màu, phông chữ, kiểu logo, chữ viết tắt và khẩu hiệu.
 * Danh thiếp, trang hồ sơ chia sẻ và ảnh bìa mạng xã hội được VẼ từ chính các giá trị này + Hồ sơ cửa hàng,
 * nên không lưu riêng — chọn phương án là đồng bộ cả bộ. Thuần — không import hạ tầng.
 */
import { BRAND_STYLES, isBrandStyleKey, type BrandPalette, type BrandStyleKey, type LogoLayout } from "./brand-styles"
import { rotateHue } from "./color-math"

export interface IdentityOptionContent {
  readonly style_key: BrandStyleKey
  readonly variant: number
  readonly palette: BrandPalette
  readonly font_heading: string
  readonly font_body: string
  readonly logo_layout: LogoLayout
  readonly initials: string
  readonly slogan: string
  readonly slogan_source: "ai" | "template"
  /** Một câu vì sao phương án hợp với cửa hàng (hiện cho chủ tiệm) */
  readonly rationale: string
  /** Ảnh logo PNG đã lưu vào kho khi phương án được chọn (dùng lại khi chọn lại) */
  readonly generated_logo_asset_id: string | null
}

export const SLOGAN_MAX_CHARS = 60

/** Biến thể thứ n xoay sắc độ 40° để phương án tạo thêm khác hẳn phương án gốc cùng phong cách. */
export function paletteFor(style: BrandStyleKey, variant: number): BrandPalette {
  const base = BRAND_STYLES[style].palette
  if (variant <= 0) return base
  const deg = 40 * variant
  return {
    primary: rotateHue(base.primary, deg),
    secondary: rotateHue(base.secondary, deg),
    accent: rotateHue(base.accent, deg),
    background: base.background,
    text: base.text,
  }
}

/** Từ chung chung không dùng làm chữ viết tắt ("Cửa hàng Mộc Lan" → "ML"). */
const GENERIC_WORDS = new Set(["tiệm", "cửa", "hàng", "shop", "store", "quán", "nhà", "công", "ty", "cty", "the", "hoa"])

export function initialsOf(name: string): string {
  const words = name.trim().split(/[\s\-_.&,]+/).filter((w) => /\p{L}|\p{N}/u.test(w))
  const significant = words.filter((w) => !GENERIC_WORDS.has(w.toLocaleLowerCase("vi")))
  const pick = significant.length > 0 ? significant : words
  const letters = pick.slice(0, 2).map((w) => Array.from(w)[0] ?? "")
  const out = letters.join("") || Array.from(name.trim()).slice(0, 2).join("")
  return out.toLocaleUpperCase("vi") || "TH"
}

export interface StyleSignals {
  readonly description: string | null
  readonly brandMessage: string | null
  readonly targetCustomers: readonly string[]
}

const SIGNALS: ReadonlyArray<{ style: BrandStyleKey; words: readonly string[] }> = [
  { style: "LUXURY", words: ["doanh nghiệp", "công ty", "văn phòng", "sếp", "đối tác", "cao cấp", "sang trọng", "khai trương", "vip"] },
  { style: "YOUTHFUL", words: ["sinh viên", "học sinh", "giới trẻ", "bạn trẻ", "cặp đôi", "người yêu", "gen z", "trẻ trung", "online"] },
  { style: "RUSTIC", words: ["gia đình", "thủ công", "handmade", "mộc", "truyền thống", "người quen", "hàng xóm", "khu phố", "tự tay"] },
]

/** Phong cách hợp nhất với hồ sơ (đếm từ khoá); không rõ thì LUXURY. */
export function recommendStyle(s: StyleSignals): BrandStyleKey {
  const text = [s.description ?? "", s.brandMessage ?? "", ...s.targetCustomers].join(" ").toLocaleLowerCase("vi")
  let best: BrandStyleKey = "LUXURY"
  let bestScore = 0
  for (const { style, words } of SIGNALS) {
    const score = words.filter((w) => text.includes(w)).length
    if (score > bestScore) {
      best = style
      bestScore = score
    }
  }
  return best
}

/** Khẩu hiệu dự phòng: lấy mẫu theo phong cách và biến thể, cắt gọn trong giới hạn. */
export function fallbackSlogan(style: BrandStyleKey, variant: number): string {
  const list = BRAND_STYLES[style].fallbackSlogans
  return list[variant % list.length]!
}

/** Làm sạch khẩu hiệu từ AI: một dòng, bỏ ngoặc kép, ≤ 60 ký tự; rỗng → null. */
export function cleanSlogan(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const t = raw.replace(/[\r\n]+/g, " ").replace(/^["'“”«»\s]+|["'“”«»\s.]+$/g, "").replace(/\s{2,}/g, " ").trim()
  if (!t || Array.from(t).length > SLOGAN_MAX_CHARS) return null
  return t
}

export function buildIdentityOption(input: {
  style: BrandStyleKey
  variant: number
  shopName: string
  slogan: string | null
  rationale: string | null
}): IdentityOptionContent {
  const style = BRAND_STYLES[input.style]
  return {
    style_key: input.style,
    variant: input.variant,
    palette: paletteFor(input.style, input.variant),
    font_heading: style.fontHeading,
    font_body: style.fontBody,
    logo_layout: style.logoLayout,
    initials: initialsOf(input.shopName),
    slogan: input.slogan ?? fallbackSlogan(input.style, input.variant),
    slogan_source: input.slogan ? "ai" : "template",
    rationale: input.rationale?.trim() || style.description,
    generated_logo_asset_id: null,
  }
}

const HEX = /^#[0-9A-F]{6}$/i

/** Đọc nội dung Json đã lưu; sai hình dạng → null (bỏ qua bản ghi hỏng thay vì vỡ màn hình). */
export function parseIdentityContent(raw: unknown): IdentityOptionContent | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  const p = r.palette as Record<string, unknown> | undefined
  if (!isBrandStyleKey(r.style_key) || !p) return null
  const keys = ["primary", "secondary", "accent", "background", "text"] as const
  if (!keys.every((k) => typeof p[k] === "string" && HEX.test(p[k] as string))) return null
  if (typeof r.slogan !== "string" || typeof r.initials !== "string") return null
  const style = BRAND_STYLES[r.style_key]
  return {
    style_key: r.style_key,
    variant: typeof r.variant === "number" ? r.variant : 0,
    palette: Object.fromEntries(keys.map((k) => [k, p[k]])) as unknown as BrandPalette,
    font_heading: typeof r.font_heading === "string" ? r.font_heading : style.fontHeading,
    font_body: typeof r.font_body === "string" ? r.font_body : style.fontBody,
    logo_layout: r.logo_layout === "MONOGRAM" || r.logo_layout === "BADGE" || r.logo_layout === "WORDMARK" ? r.logo_layout : style.logoLayout,
    initials: r.initials,
    slogan: r.slogan,
    slogan_source: r.slogan_source === "ai" ? "ai" : "template",
    rationale: typeof r.rationale === "string" ? r.rationale : style.description,
    generated_logo_asset_id: typeof r.generated_logo_asset_id === "string" ? r.generated_logo_asset_id : null,
  }
}
