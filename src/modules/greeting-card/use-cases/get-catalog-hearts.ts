import type { TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { tallyHearts } from "../domain/catalog-hearts"
import { CatalogHeartsRepository, getCatalogHeartsRepository } from "../infra/catalog-hearts-repository"
import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"

/**
 * Bảng "Mẫu được thả tim nhiều nhất" của một bộ sưu tập: cộng tim từ link gửi riêng và link công
 * khai; mỗi khách tối đa 1 tim/mẫu. Mẫu đã gỡ khỏi bộ sưu tập không hiện. Tổ chức khác → 404.
 */
export async function getCatalogHearts(
  ctx: TenantContext,
  catalogId: string,
  catalogs = getGreetingCardRepository(),
  hearts = getCatalogHeartsRepository(),
) {
  const catalog = await catalogs.getCatalogById(ctx, catalogId)
  if (!catalog) throw notFound()
  const products = new Map(catalog.items.map((i) => [i.product.id, i.product]))
  const rows = tallyHearts(await hearts.listHeartActions(ctx, catalogId))
    .filter((r) => products.has(r.productId))
    .map((r) => {
      const p = products.get(r.productId)!
      return { ...r, code: p.code, name: p.name, imageUrl: p.masterImageUrl ?? null }
    })
  return { catalogId, totalHearts: rows.reduce((n, r) => n + r.hearts, 0), rows }
}
