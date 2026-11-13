import { notFound } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IAssetRepository } from "../domain/repositories/asset-repository.interface"
import { getAssetRepository } from "../infra/asset-repository"

/** `GET /assets/:id` (`G1`). */
export async function getAsset(
  ctx: TenantContext,
  id: string,
  repo: IAssetRepository = getAssetRepository()
) {
  const asset = await repo.findById(ctx, id)
  if (!asset) throw notFound()
  return asset
}
