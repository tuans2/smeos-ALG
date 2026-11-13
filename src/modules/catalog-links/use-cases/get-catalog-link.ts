import type { ICatalogLinkRepository } from "@/modules/catalog-links/domain/repositories/catalog-link-repository.interface"
import { getCatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"
import type { CatalogLinkResult } from "@/modules/catalog-links/domain/catalog-link-rules"

export async function getCatalogLinkBySlug(
  slug: string,
  repo: ICatalogLinkRepository = getCatalogLinkRepository()
): Promise<CatalogLinkResult | null> {
  const link = await repo.findBySlug(slug)
  if (!link) return null
  if (link.is_revoked) return null

  return {
    id: link.id,
    slug: link.slug,
    name: link.name,
    description: link.description,
    filters: link.filters as CatalogLinkResult["filters"],
    is_revoked: link.is_revoked,
    revoked_at: link.revoked_at?.toISOString() ?? null,
    revoked_by: link.revoked_by ?? null,
    created_by: link.created_by,
    created_at: link.created_at.toISOString(),
    updated_at: link.updated_at.toISOString(),
  }
}