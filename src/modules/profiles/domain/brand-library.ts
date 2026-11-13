/**
 * Thư viện nhận diện thương hiệu (công cụ 45) — luật thuần.
 * Loại tài nguyên quyết định nội dung là ảnh hay văn bản; kiểm ở máy chủ.
 */
import { isValidHexColor } from "./profile-rules"

export const BRAND_LIBRARY_CATEGORIES = ["LOGO", "COLOR", "FONT", "IMAGE", "TEMPLATE", "GUIDELINE", "COPY"] as const
export type BrandLibraryCategory = (typeof BRAND_LIBRARY_CATEGORIES)[number]

export const CATEGORY_LABEL: Record<BrandLibraryCategory, string> = {
  LOGO: "Logo", COLOR: "Bảng màu", FONT: "Phông chữ", IMAGE: "Hình ảnh",
  TEMPLATE: "Mẫu ấn phẩm", GUIDELINE: "Hướng dẫn sử dụng", COPY: "Câu chữ chuẩn",
}

/** Loại cần tệp ảnh; các loại còn lại là văn bản. */
const FILE_CATEGORIES: ReadonlySet<BrandLibraryCategory> = new Set(["LOGO", "IMAGE", "TEMPLATE"])
export const isFileCategory = (c: BrandLibraryCategory) => FILE_CATEGORIES.has(c)

export const BRAND_LIBRARY_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"] as const

export const LIMITS = { title: 120, description: 500, text: 5000, note: 300 } as const

export function isBrandLibraryCategory(v: unknown): v is BrandLibraryCategory {
  return typeof v === "string" && (BRAND_LIBRARY_CATEGORIES as readonly string[]).includes(v)
}

/** Mã màu cách nhau bởi dấu phẩy, khoảng trắng hoặc xuống dòng. */
export function parseColorList(text: string): string[] {
  return text.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean)
}

export interface VersionContentInput {
  readonly assetId?: string | null | undefined
  readonly textValue?: string | null | undefined
  readonly note?: string | null | undefined
}

export function validateVersionContent(category: BrandLibraryCategory, input: VersionContentInput): Record<string, string> {
  const errors: Record<string, string> = {}
  const text = input.textValue?.trim() ?? ""
  if (isFileCategory(category)) {
    if (!input.assetId) errors.asset_id = "Cần chọn tệp ảnh"
  } else if (!text) {
    errors.text_value = "Cần nhập nội dung"
  } else if (text.length > LIMITS.text) {
    errors.text_value = `Nội dung tối đa ${LIMITS.text} ký tự`
  } else if (category === "COLOR") {
    const colors = parseColorList(text)
    if (colors.length === 0 || colors.some((c) => !isValidHexColor(c))) {
      errors.text_value = "Mã màu dạng #RRGGBB, cách nhau bởi dấu phẩy"
    }
  }
  if ((input.note?.length ?? 0) > LIMITS.note) errors.note = `Ghi chú tối đa ${LIMITS.note} ký tự`
  return errors
}

export function validateItemMeta(input: { title?: string | undefined; description?: string | null | undefined }): Record<string, string> {
  const errors: Record<string, string> = {}
  if (input.title !== undefined) {
    const t = input.title.trim()
    if (!t) errors.title = "Cần đặt tên"
    else if (t.length > LIMITS.title) errors.title = `Tên tối đa ${LIMITS.title} ký tự`
  }
  if ((input.description?.length ?? 0) > LIMITS.description) errors.description = `Mô tả tối đa ${LIMITS.description} ký tự`
  return errors
}

export type BrandLibraryStatus = "ACTIVE" | "ARCHIVED"

export interface BrandLibraryVersionView {
  readonly version: number
  readonly text_value: string | null
  readonly file_url: string | null
  readonly note: string | null
  readonly created_at: string
}

export interface BrandLibraryItemView {
  readonly id: string
  readonly title: string
  readonly category: BrandLibraryCategory
  readonly description: string | null
  readonly share_with_members: boolean
  readonly status: BrandLibraryStatus
  readonly current_version: number
  readonly updated_at: string
  readonly latest: BrandLibraryVersionView | null
}
