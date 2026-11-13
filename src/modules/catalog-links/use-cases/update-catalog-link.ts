import { validationFailed, notFound } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import type { ICatalogLinkRepository } from "@/modules/catalog-links/domain/repositories/catalog-link-repository.interface"
import { getCatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import { validateFilters, type CatalogLinkFilters, type CatalogLinkResult } from "@/modules/catalog-links/domain/catalog-link-rules"

export async function updateCatalogLink(
  ctx: TenantContext,
  slug: string,
  input: { name?: string; description?: string | null; filters?: CatalogLinkFilters | null },
  repo: ICatalogLinkRepository = getCatalogLinkRepository()
) {
  requireCapability(ctx, "J1")

  if (input.filters) {
    const filtersError = validateFilters(input.filters)
    if (filtersError) throw validationFailed({ filters: filtersError })
  }

  const existing = await repo.findBySlugInOrg(ctx, slug)
  if (!existing) throw notFound()

  const updated = await repo.update(ctx, slug, {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description?.trim() ?? null } : {}),
    ...(input.filters !== undefined ? { filters: input.filters ?? null } : {}),
  })

  if (!updated) throw notFound()

  return {
    id: updated.id,
    slug: updated.slug,
    name: updated.name,
    description: updated.description,
    filters: updated.filters as CatalogLinkResult["filters"],
    is_revoked: updated.is_revoked,
    revoked_at: updated.revoked_at?.toISOString() ?? null,
    revoked_by: updated.revoked_by ?? null,
    created_by: updated.created_by,
    created_at: updated.created_at.toISOString(),
    updated_at: updated.updated_at.toISOString(),
  }
}