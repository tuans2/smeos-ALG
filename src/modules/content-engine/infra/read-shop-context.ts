/**
 * Đọc `shop` của Brief v1 (`contracts/brief.ts`) từ `brand_profiles` +
 * `business_profiles` — hai bảng một-bản-ghi-mỗi-tổ-chức đã có
 * (`BrandProfileRepository`/`BusinessProfileRepository`, tự lọc theo
 * `organization_id` của phiên qua `TenantContext`).
 *
 * Hạ tầng — được phép import Prisma/repository (khác `domain/`).
 */

import type { TenantContext } from "@/core/tenancy"
import { BrandProfileRepository } from "@/modules/profiles/infra/brand-profile-repository"
import { BusinessProfileRepository } from "@/modules/profiles/infra/business-profile-repository"
import { extractBrandHashtags, extractBrandCtaPhrase } from "@/modules/profiles/domain/profile-rules"

import type { RawShopInput } from "../domain/brief-builder"

/**
 * `brand_profiles.forbidden_styles`/`default_offers` là `Json?` — nhiều nơi
 * trong repo (`revise-assets.ts`, `manage-campaign-package.ts`) đã gặp cả ba
 * hình dạng (chuỗi, mảng, đối tượng `{ default }`) tuỳ đợt lưu. Đọc phòng thủ
 * giống các nơi đó, không ném lỗi khi hình dạng khác dự kiến.
 */
function toStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  if (typeof raw === "string") {
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
  }
  if (raw !== null && typeof raw === "object") {
    const inner = (raw as { default?: unknown }).default
    if (inner !== undefined) return toStringArray(inner)
  }
  return []
}

function extractDefaultOffers(raw: unknown): { freeGifts: string[]; guarantees: string[] } {
  if (raw === null || typeof raw !== "object") return { freeGifts: [], guarantees: [] }
  const o = raw as { free_gifts?: unknown; guarantees?: unknown }
  return { freeGifts: toStringArray(o.free_gifts), guarantees: toStringArray(o.guarantees) }
}

function extractOperatingHours(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (raw !== null && typeof raw === "object") {
    const inner = (raw as { default?: unknown }).default
    if (typeof inner === "string" && inner.trim()) return inner.trim()
  }
  return null
}

export async function readShopContext(ctx: TenantContext): Promise<RawShopInput> {
  const [brand, business] = await Promise.all([
    new BrandProfileRepository().current(ctx),
    new BusinessProfileRepository().current(ctx),
  ])

  const displayName = business?.display_name?.trim() || business?.legal_name?.trim() || "Cửa hàng"

  return {
    displayName,
    toneOfVoice: brand?.tone_of_voice ?? null,
    hashtags: brand ? extractBrandHashtags(brand.hashtags) ?? [] : [],
    ctaPhrase: brand ? extractBrandCtaPhrase(brand.cta_templates) : null,
    defaultOffers: brand ? extractDefaultOffers(brand.default_offers) : { freeGifts: [], guarantees: [] },
    forbiddenStyles: brand ? toStringArray(brand.forbidden_styles) : [],
    phone: business?.phone ?? null,
    address: business?.address ?? null,
    website: business?.website ?? null,
    operatingHours: business ? extractOperatingHours(business.operating_hours) : null,
    brandMessage: business?.brand_message?.trim() || null,
    targetCustomers: business ? toStringArray(business.target_customers) : [],
  }
}
