/**
 * Ngữ cảnh chung của mục Thương hiệu: Hồ sơ cửa hàng, nguyên liệu, phương án đã sinh, cờ 3 bước và dấu hồ sơ.
 * Mọi use-case của brand-kit đọc qua đây để cùng một luật khoá bước (máy chủ không tin giao diện).
 */
import type { TenantContext } from "@/core/tenancy"
import { getBusinessProfile, type BusinessProfileDetail } from "@/modules/profiles/use-cases/get-business-profile"
import { getBrandProfile, type BrandProfileDetail } from "@/modules/profiles/use-cases/get-brand-profile"
import { readBrandMaterials, type BrandMaterials } from "../domain/brand-assets"
import { evaluateProfileStep, type BrandJourneyFlags, type ProfileStepResult } from "../domain/brand-journey"
import { fingerprintOf } from "../domain/fingerprint"
import { parseIdentityContent, type IdentityOptionContent } from "../domain/identity-option"
import { parseLandingContent, type LandingOptionContent } from "../domain/landing-option"
import type { BatchState } from "../domain/option-rules"
import type { BrandStyleOptionRow, IBrandStyleOptionRepository } from "../domain/repositories/brand-style-option-repository.interface"
import { getBrandStyleOptionRepository } from "../infra/brand-style-option-repository"

export interface BrandKitDeps {
  readonly repo: IBrandStyleOptionRepository
  readonly loadBusiness: (ctx: TenantContext) => Promise<BusinessProfileDetail | null>
  readonly loadBrand: (ctx: TenantContext) => Promise<BrandProfileDetail | null>
}

export const defaultBrandKitDeps = (): BrandKitDeps => ({
  repo: getBrandStyleOptionRepository(),
  loadBusiness: (ctx) => getBusinessProfile(ctx),
  loadBrand: (ctx) => getBrandProfile(ctx),
})

export interface Parsed<C> {
  readonly row: BrandStyleOptionRow
  readonly content: C
}

export interface BrandKitContext {
  readonly business: BusinessProfileDetail | null
  readonly brand: BrandProfileDetail | null
  readonly materials: BrandMaterials
  readonly profile: ProfileStepResult
  readonly identity: readonly Parsed<IdentityOptionContent>[]
  readonly landing: readonly Parsed<LandingOptionContent>[]
  readonly selectedIdentity: Parsed<IdentityOptionContent> | null
  readonly selectedLanding: Parsed<LandingOptionContent> | null
  readonly flags: BrandJourneyFlags
  readonly identityFingerprint: string
  readonly landingFingerprint: string
  /** Logo hiện tại do chủ tiệm tự tải lên (không phải logo hệ thống dựng) → phương án giữ logo đó */
  readonly uploadedLogo: boolean
}

function parseAll<C>(rows: readonly BrandStyleOptionRow[], parse: (raw: unknown) => C | null): Parsed<C>[] {
  return rows.flatMap((row) => {
    const content = parse(row.content)
    return content ? [{ row, content }] : []
  })
}

export function batchStateOf(options: readonly Parsed<unknown>[], currentFingerprint: string): BatchState {
  const latest = options.reduce((m, o) => Math.max(m, o.row.batch), 0)
  const inLatest = options.filter((o) => o.row.batch === latest)
  return {
    batchCount: latest,
    latestBatchSize: inLatest.length,
    profileChanged: inLatest.length > 0 && inLatest[0]!.row.profile_fingerprint !== currentFingerprint,
  }
}

export async function loadBrandKitContext(ctx: TenantContext, deps: BrandKitDeps = defaultBrandKitDeps()): Promise<BrandKitContext> {
  const [business, brand, identityRows, landingRows] = await Promise.all([
    deps.loadBusiness(ctx),
    deps.loadBrand(ctx),
    deps.repo.list(ctx, "IDENTITY"),
    deps.repo.list(ctx, "LANDING"),
  ])
  const materials = readBrandMaterials(brand?.brand_assets)
  const profile = evaluateProfileStep({ business, brand })
  const identity = parseAll(identityRows, parseIdentityContent)
  const landing = parseAll(landingRows, parseLandingContent)
  const selectedIdentity = identity.find((o) => o.row.selected_at !== null) ?? null
  const selectedLanding = landing.find((o) => o.row.selected_at !== null) ?? null

  const identityFingerprint = fingerprintOf({
    name: business?.display_name, description: business?.description,
    message: business?.brand_message, audience: business?.target_customers,
  })
  const landingFingerprint = fingerprintOf({
    identity: identityFingerprint, chosen: selectedIdentity?.row.id,
    products: materials.featuredProductIds, photos: materials.storefrontPhotos, video: materials.introVideo,
  })
  const generatedLogos = new Set(identity.flatMap((o) => (o.content.generated_logo_asset_id ? [o.content.generated_logo_asset_id] : [])))
  const logo = brand?.logo_asset_id ?? null

  return {
    business, brand, materials, profile, identity, landing, selectedIdentity, selectedLanding,
    flags: {
      profileDone: profile.done,
      identityDone: selectedIdentity !== null,
      landingDone: selectedLanding !== null && selectedLanding.content.published_slug !== null,
    },
    identityFingerprint,
    landingFingerprint,
    uploadedLogo: Boolean(logo && !generatedLogos.has(logo)),
  }
}
