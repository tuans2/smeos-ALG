import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { FieldCatalogRepository, getFieldCatalogRepository } from "../infra/field-catalog-repository"
import { mapCatalogToApiView, type CatalogApiView } from "../infra/row-mappers"

/** `GET /api/v1/platform/catalogs` (`N12`, 3.13). */
export async function listCatalogs(pctx: PlatformContext): Promise<CatalogApiView[]> {
  requirePlatformCapability(pctx, "N12")
  const repo = getFieldCatalogRepository()
  const catalogs = await repo.listCatalogs()
  return Promise.all(catalogs.map(async (catalog) => mapCatalogToApiView(catalog, await repo.listValues(catalog.key))))
}
