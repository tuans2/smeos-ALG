import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { storageKeyFromReference } from "@/modules/assets/domain/storage-reconciliation"
import type { LibraryType } from "../domain/library"
import type { LibraryRow } from "./library-repository"

/**
 * Ảnh bìa của một mục thư viện — cùng chuỗi dự phòng với `ProductThumb`
 * (`src/components/products/product-thumb.tsx`): ảnh lưu trữ → ảnh trong
 * `attributes.imageUrl` → Google Drive. Một mục có thể không có ảnh.
 */
export type LibraryCover = { storageKey?: string; imageUrl?: string; driveLink?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ảnh MAIN + dự phòng trong `attributes` của từng sản phẩm (như `greeting-catalog-repository.ts`). */
async function productCovers(ctx: TenantContext, productIds: string[]): Promise<Map<string, LibraryCover>> {
  if (productIds.length === 0) return new Map()
  const products = await prisma.products.findMany({
    where: scopedWhere(ctx, { id: { in: [...new Set(productIds)] } }),
    select: { id: true, attributes: true, images: { where: { role: "MAIN" }, take: 1, select: { asset_id: true } } },
  })
  const keys = await assetKeys(ctx, products.flatMap((p) => p.images.map((i) => i.asset_id)))
  return new Map(
    products.map((p) => {
      const attrs = (p.attributes as Record<string, unknown> | null) ?? {}
      const storageKey = p.images[0] ? keys.get(p.images[0].asset_id) : undefined
      const imageUrl = typeof attrs.imageUrl === "string" && attrs.imageUrl ? attrs.imageUrl : undefined
      const driveLink = typeof attrs.drive_link === "string" && attrs.drive_link ? attrs.drive_link : undefined
      return [p.id, { ...(storageKey ? { storageKey } : {}), ...(imageUrl ? { imageUrl } : {}), ...(driveLink ? { driveLink } : {}) }]
    })
  )
}

/** asset id → khoá ảnh (thumbnail trước), chỉ asset ảnh của tổ chức. */
async function assetKeys(ctx: TenantContext, assetIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(assetIds.filter((id) => UUID.test(id)))]
  if (ids.length === 0) return new Map()
  const assets = await prisma.assets.findMany({
    where: scopedWhere(ctx, { id: { in: ids }, mime_type: { startsWith: "image/" } }),
    select: { id: true, storage_key: true, thumb_key: true },
  })
  return new Map(assets.map((a) => [a.id, a.thumb_key ?? a.storage_key]))
}

function firstBy<T>(rows: T[], key: (row: T) => string): Map<string, T> {
  const out = new Map<string, T>()
  for (const row of rows) if (!out.has(key(row))) out.set(key(row), row)
  return out
}

export async function loadLibraryCovers(ctx: TenantContext, type: LibraryType, rows: LibraryRow[]): Promise<Map<string, LibraryCover>> {
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return new Map()
  switch (type) {
    case "greeting_catalog": {
      const items = await prisma.greeting_catalog_products.findMany({
        where: scopedWhere(ctx, { catalog_id: { in: ids } }),
        orderBy: { sort_order: "asc" },
        select: { catalog_id: true, product_id: true },
      })
      const first = firstBy(items, (i) => i.catalog_id)
      const covers = await productCovers(ctx, [...first.values()].map((i) => i.product_id))
      return new Map([...first].map(([catalogId, item]) => [catalogId, covers.get(item.product_id) ?? {}]))
    }
    case "content": {
      const gens = await prisma.content_generations.findMany({
        where: scopedWhere(ctx, { id: { in: ids } }),
        select: { id: true, asset_id: true, product_id: true },
      })
      const keys = await assetKeys(ctx, gens.flatMap((g) => (g.asset_id ? [g.asset_id] : [])))
      const products = await productCovers(ctx, gens.flatMap((g) => (!g.asset_id && g.product_id ? [g.product_id] : [])))
      return new Map(
        gens.map((g) => {
          const key = g.asset_id ? keys.get(g.asset_id) : undefined
          return [g.id, key ? { storageKey: key } : (g.product_id ? (products.get(g.product_id) ?? {}) : {})]
        })
      )
    }
    case "video": {
      const scenes = await prisma.video_scenes.findMany({
        where: { video_job_id: { in: ids }, job: scopedWhere(ctx, {}), image_asset_id: { not: null } },
        orderBy: { scene_index: "asc" },
        select: { video_job_id: true, image_asset_id: true },
      })
      const first = firstBy(scenes, (s) => s.video_job_id)
      const keys = await assetKeys(ctx, [...first.values()].map((s) => s.image_asset_id!))
      return new Map(
        [...first].map(([jobId, s]) => {
          const ref = s.image_asset_id!
          const key = keys.get(ref) ?? storageKeyFromReference(ref)
          return [jobId, key && key.startsWith(`org/${ctx.organizationId}/`) ? { storageKey: key } : {}]
        })
      )
    }
    case "catalog": {
      const links = await prisma.catalog_links.findMany({ where: scopedWhere(ctx, { id: { in: ids } }), select: { id: true, filters: true } })
      return new Map(
        links.map((l) => {
          const hero = ((l.filters as Record<string, unknown> | null) ?? {}).customHeroImageUrl
          const key = typeof hero === "string" ? storageKeyFromReference(hero) : null
          return [l.id, key && key.startsWith(`org/${ctx.organizationId}/`) ? { storageKey: key } : {}]
        })
      )
    }
    case "landing": {
      const pages = await prisma.landing_pages.findMany({ where: scopedWhere(ctx, { id: { in: ids } }), select: { id: true, input: true } })
      const codeOf = (input: unknown): string | null => {
        const products = (input as { selectedProducts?: { code?: unknown }[] } | null)?.selectedProducts
        const code = Array.isArray(products) ? products[0]?.code : null
        return typeof code === "string" && code ? code : null
      }
      const codes = [...new Set(pages.map((p) => codeOf(p.input)).filter((c): c is string => !!c))]
      const byCode = codes.length
        ? await prisma.products.findMany({ where: scopedWhere(ctx, { code: { in: codes } }), select: { id: true, code: true } })
        : []
      const covers = await productCovers(ctx, byCode.map((p) => p.id))
      const productOfCode = new Map(byCode.map((p) => [p.code, p.id]))
      return new Map(
        pages.map((p) => {
          const productId = productOfCode.get(codeOf(p.input) ?? "")
          return [p.id, productId ? (covers.get(productId) ?? {}) : {}]
        })
      )
    }
    default:
      return new Map()
  }
}
