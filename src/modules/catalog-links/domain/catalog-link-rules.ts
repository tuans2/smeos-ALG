export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type CatalogLinkFilters = {
  occasionCodes?: string[]
  colorCodes?: string[]
  flowerTypes?: string[]
  collections?: string[]
  priceRange?: { min?: number; max?: number }
} & Record<string, unknown>

export function validateSlug(slug: string): string | "" {
  if (!slug || slug.length < 3) return "Slug tối thiểu 3 ký tự"
  if (slug.length > 100) return "Slug tối đa 100 ký tự"
  if (!SLUG_REGEX.test(slug)) return "Slug chỉ chứa chữ cái thường, số và dấu gạch ngang (a-z, 0-9, -)"
  return ""
}

export function validateFilters(filters: CatalogLinkFilters): string | "" {
  if (filters.priceRange) {
    const { min, max } = filters.priceRange
    if (min !== undefined && (typeof min !== "number" || min < 0)) return "priceRange.min phải là số không âm"
    if (max !== undefined && (typeof max !== "number" || max < 0)) return "priceRange.max phải là số không âm"
    if (min !== undefined && max !== undefined && max < min) return "priceRange.max phải lớn hơn hoặc bằng min"
  }
  return ""
}

export function slugifyVietnamese(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function generateAutoSlug(name: string): string {
  const base = slugifyVietnamese(name) || "catalog"
  const rand = Math.random().toString(36).substring(2, 7)
  const trimmedBase = base.slice(0, 40).replace(/-$/, "")
  return `${trimmedBase || "catalog"}-${rand}`
}

export function normalizeSlug(input: string): string {
  return slugifyVietnamese(input)
}

export interface CatalogLinkResult {
  id: string
  slug: string
  name: string
  description: string | null
  filters: CatalogLinkFilters | null
  is_revoked: boolean
  revoked_at: string | null
  revoked_by: string | null
  created_by: string
  created_at: string
  updated_at: string
}