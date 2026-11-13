import { validationFailed } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import type { ICatalogLinkRepository } from "@/modules/catalog-links/domain/repositories/catalog-link-repository.interface"
import { getCatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import {
  validateSlug,
  normalizeSlug,
  validateFilters,
  generateAutoSlug,
  type CatalogLinkFilters,
} from "@/modules/catalog-links/domain/catalog-link-rules"

const MAX_AUTO_SLUG_ATTEMPTS = 5

export async function createCatalogLink(
  ctx: TenantContext,
  input: { slug?: string | null; name: string; description?: string | null; filters?: CatalogLinkFilters | null },
  repo: ICatalogLinkRepository = getCatalogLinkRepository()
) {
  requireCapability(ctx, "J1")

  let finalSlug = input.slug ? normalizeSlug(input.slug) : ""
  if (!finalSlug) {
    finalSlug = generateAutoSlug(input.name)
  }

  const slugError = validateSlug(finalSlug)
  if (slugError) throw validationFailed({ slug: slugError })

  const filtersError = validateFilters(input.filters ?? {})
  if (filtersError) throw validationFailed({ filters: filtersError })

  let existing = await repo.findBySlug(finalSlug)
  if (existing && input.slug) {
    throw validationFailed({ slug: "Slug đã được sử dụng" })
  }
  // Vòng thử slug tự sinh phải có giới hạn (AGENT_RULES: mọi vòng lặp/thử lại đều bị chặn)
  for (let attempt = 0; existing && attempt < MAX_AUTO_SLUG_ATTEMPTS; attempt++) {
    finalSlug = generateAutoSlug(input.name)
    existing = await repo.findBySlug(finalSlug)
  }
  if (existing) throw validationFailed({ slug: "Không tạo được đường dẫn riêng, vui lòng thử lại" })

  return repo.create(ctx, {
    slug: finalSlug,
    name: input.name.trim(),
    description: input.description?.trim() ?? null,
    filters: input.filters ?? null,
    createdBy: ctx.userId,
  })
}