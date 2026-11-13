import { validationFailed, notFound } from "@/core/http/errors"
import { requireCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import type { ICatalogLinkRepository } from "@/modules/catalog-links/domain/repositories/catalog-link-repository.interface"
import { getCatalogLinkRepository } from "@/modules/catalog-links/infra/catalog-link-repository"

export async function revokeCatalogLink(
  ctx: TenantContext,
  slug: string,
  repo: ICatalogLinkRepository = getCatalogLinkRepository()
): Promise<boolean> {
  requireCapability(ctx, "J2")

  const existing = await repo.findBySlugInOrg(ctx, slug)
  if (!existing) throw notFound()
  if (existing.is_revoked) throw validationFailed({ slug: "Liên kết đã bị thu hồi" })

  return repo.revoke(ctx, slug, ctx.userId)
}