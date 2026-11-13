import { prisma } from "@/core/tenancy/infra/prisma"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import { recipeFromAttributes } from "@/modules/greeting-card/domain/recipe-snapshot"
import type { FloristProductFallback } from "../domain/florist-work"

const PRINT_URL_TTL_MS = 60 * 60_000

/**
 * Ảnh chính và công thức của các sản phẩm trên đơn, đọc lúc in phiếu xưởng (checklist ALG 4.9): đường dẫn ảnh
 * ký mới (ảnh chụp mẫu lúc khách đặt có hạn ký), công thức từ form sản phẩm. Chỉ trong tổ chức của đơn.
 */
export async function loadPrintProducts(organizationId: string, productIds: string[]): Promise<Map<string, FloristProductFallback>> {
  const ids = [...new Set(productIds)]
  const out = new Map<string, FloristProductFallback>()
  if (ids.length === 0) return out
  const products = await prisma.products.findMany({
    where: { organization_id: organizationId, id: { in: ids } },
    select: { id: true, attributes: true, images: { where: { role: "MAIN" }, orderBy: { position: "asc" }, take: 1, select: { asset_id: true } } },
  })
  const assetIds = products.flatMap((p) => p.images.map((i) => i.asset_id))
  const assets = assetIds.length
    ? await prisma.assets.findMany({ where: { organization_id: organizationId, id: { in: assetIds } }, select: { id: true, storage_key: true } })
    : []
  const exp = Date.now() + PRINT_URL_TTL_MS
  const urls = new Map(assets.map((a) => [a.id, `/api/v1/storage/${a.storage_key}?exp=${exp}&sig=${signStorageUrl(a.storage_key, exp)}`]))
  for (const p of products) {
    const attrs = p.attributes && typeof p.attributes === "object" ? (p.attributes as Record<string, unknown>) : {}
    const fallback = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : null
    const assetId = p.images[0]?.asset_id
    out.set(p.id, { imageUrl: (assetId ? urls.get(assetId) : undefined) ?? fallback, recipe: recipeFromAttributes(p.attributes) })
  }
  return out
}
