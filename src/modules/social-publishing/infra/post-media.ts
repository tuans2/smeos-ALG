import { prisma } from "@/core/tenancy/infra/prisma"
import { getStorageProvider } from "@/modules/assets/adapters/storage-provider-factory"

/** Link ký cho nền tảng tải ảnh: đủ lâu cho một lượt đăng (kể cả Instagram xử lý container), không lưu lại. */
export const MEDIA_URL_TTL_SECONDS = 60 * 60

/** Kiểu ảnh dùng để đăng (`asset_kind`): ảnh gốc, đã tăng chất lượng, ảnh chính, ảnh tiếp thị / mạng xã hội. */
const POSTABLE_KINDS = ["ORIGINAL", "ENHANCED", "MASTER", "MARKETING", "SOCIAL"] as const

/**
 * Ảnh sản phẩm để đăng, theo thứ tự: ảnh của Thẻ sản phẩm đã duyệt trước, rồi các ảnh khác gắn với sản phẩm (góc chụp
 * khác, ảnh đã tối ưu). Bỏ ảnh trong thùng rác. Lọc theo tổ chức.
 */
export async function productImageAssetIds(organizationId: string, productId: string, max: number): Promise<string[]> {
  const [analysis, assets] = await Promise.all([
    prisma.product_analyses.findFirst({
      where: { organization_id: organizationId, product_id: productId, approval_state: "APPROVED" },
      orderBy: [{ approved_at: "desc" }, { created_at: "desc" }],
      select: { asset_id: true },
    }),
    prisma.assets.findMany({
      where: { organization_id: organizationId, product_id: productId, trashed_at: null, kind: { in: [...POSTABLE_KINDS] }, mime_type: { startsWith: "image/" } },
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      select: { id: true },
      take: max * 2,
    }),
  ])
  const ids = [...(analysis?.asset_id ? [analysis.asset_id] : []), ...assets.map((a) => a.id)]
  return [...new Set(ids)].slice(0, max)
}

/** Mã ảnh → link ký có hạn, giữ thứ tự; ảnh không còn (đã xoá / tổ chức khác) bị bỏ. */
export async function signedMediaUrls(organizationId: string, assetIds: readonly string[]): Promise<string[]> {
  if (assetIds.length === 0) return []
  const rows = await prisma.assets.findMany({
    where: { organization_id: organizationId, id: { in: [...assetIds] }, trashed_at: null },
    select: { id: true, storage_key: true },
  })
  const keyOf = new Map(rows.map((r) => [r.id, r.storage_key]))
  const storage = getStorageProvider()
  const out: string[] = []
  for (const id of assetIds) {
    const key = keyOf.get(id)
    if (key) out.push(await storage.signedUrl(key, MEDIA_URL_TTL_SECONDS))
  }
  return out
}
