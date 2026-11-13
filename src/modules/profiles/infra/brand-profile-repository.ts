import type { brand_profiles, InputJsonValue } from "./entities"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"
import type { DbClient } from "./db-client"
import type {
  IBrandProfileRepository,
  UpsertBrandProfileInput,
} from "../domain/repositories/brand-profile-repository.interface"

export type { UpsertBrandProfileInput, IBrandProfileRepository }

/**
 * `brand_profiles` — cùng hình dạng một-bản-ghi-mỗi-tổ-chức và cùng ngữ nghĩa
 * PUT-thay-toàn-bộ với `BusinessProfileRepository`; xem chú thích ở đó.
 */
export class BrandProfileRepository implements IBrandProfileRepository {
  constructor(private readonly db: DbClient = prisma) {}

  current(ctx: TenantContext): Promise<brand_profiles | null> {
    return this.db.brand_profiles.findUnique({
      where: { organization_id: ctx.organizationId },
    })
  }

  upsert(ctx: TenantContext, input: UpsertBrandProfileInput): Promise<brand_profiles> {
    const fields = {
      primary_color: input.primary_color ?? null,
      secondary_color: input.secondary_color ?? null,
      accent_color: input.accent_color ?? null,
      background_color: input.background_color ?? null,
      text_color: input.text_color ?? null,
      font_heading: input.font_heading ?? null,
      font_body: input.font_body ?? null,
      logo_asset_id: input.logo_asset_id ?? null,
      tone_of_voice: input.tone_of_voice ?? null,
      hashtags: (input.hashtags ?? null) as InputJsonValue,
      cta_templates: (input.cta_templates ?? null) as InputJsonValue,
      default_offers: (input.default_offers ?? null) as InputJsonValue,
      forbidden_styles: (input.forbidden_styles ?? null) as InputJsonValue,
      brand_assets: (input.brand_assets ?? null) as InputJsonValue,
      ...(input.slogan !== undefined ? { slogan: input.slogan?.trim() || null } : {}),
    }

    return this.db.brand_profiles.upsert({
      where: { organization_id: ctx.organizationId },
      create: { organization_id: ctx.organizationId, ...fields },
      update: fields,
    })
  }
}

let defaultRepo: IBrandProfileRepository | null = null

export function getBrandProfileRepository(db?: DbClient): IBrandProfileRepository {
  if (db) return new BrandProfileRepository(db)
  if (!defaultRepo) {
    defaultRepo = new BrandProfileRepository()
  }
  return defaultRepo
}
