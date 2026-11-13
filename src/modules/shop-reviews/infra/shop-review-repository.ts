import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { ShopReview } from "../domain/review-rules"

type Row = {
  id: string
  author_name: string
  occasion: string | null
  rating: number
  comment: string
  is_visible: boolean
  created_at: Date
}

const toEntity = (r: Row): ShopReview => ({
  id: r.id,
  authorName: r.author_name,
  occasion: r.occasion,
  rating: r.rating,
  comment: r.comment,
  isVisible: r.is_visible,
  createdAt: r.created_at.toISOString(),
})

export interface ShopReviewWrite {
  authorName: string
  occasion: string | null
  rating: number
  comment: string
  isVisible: boolean
}

const toColumns = (d: ShopReviewWrite) => ({
  author_name: d.authorName,
  occasion: d.occasion,
  rating: d.rating,
  comment: d.comment,
  is_visible: d.isVisible,
})

/** Mọi lệnh đọc/ghi theo phiên đều qua `scopedWhere`/`scopedData` — bản ghi tổ chức khác coi như không tồn tại. */
export async function listShopReviews(ctx: TenantContext): Promise<ShopReview[]> {
  const rows = await prisma.shop_reviews.findMany({ where: scopedWhere(ctx), orderBy: { created_at: "desc" } })
  return rows.map(toEntity)
}

export async function insertShopReview(ctx: TenantContext, d: ShopReviewWrite): Promise<ShopReview> {
  return toEntity(await prisma.shop_reviews.create({ data: scopedData(ctx, { ...toColumns(d), created_by: ctx.userId }) }))
}

/** Trả `null` khi không có bản ghi trong tổ chức của phiên (route dịch thành 404). */
export async function updateShopReview(ctx: TenantContext, id: string, d: Partial<ShopReviewWrite>): Promise<ShopReview | null> {
  const found = await prisma.shop_reviews.findFirst({ where: scopedWhere(ctx, { id }), select: { id: true } })
  if (!found) return null
  const data: Record<string, unknown> = {}
  if (d.authorName !== undefined) data.author_name = d.authorName
  if (d.occasion !== undefined) data.occasion = d.occasion
  if (d.rating !== undefined) data.rating = d.rating
  if (d.comment !== undefined) data.comment = d.comment
  if (d.isVisible !== undefined) data.is_visible = d.isVisible
  return toEntity(await prisma.shop_reviews.update({ where: { id: found.id }, data }))
}

export async function deleteShopReview(ctx: TenantContext, id: string): Promise<boolean> {
  const res = await prisma.shop_reviews.deleteMany({ where: scopedWhere(ctx, { id }) })
  return res.count > 0
}

/**
 * Trang khách công khai `/c/[slug]`: tổ chức lấy từ chính link catalog đã tra ra ở máy chủ
 * (không từ tham số người dùng). Chỉ đánh giá đang bật hiển thị.
 */
export async function listVisibleShopReviewsForOrganization(organizationId: string, limit: number): Promise<ShopReview[]> {
  const rows = await prisma.shop_reviews.findMany({
    where: { organization_id: organizationId, is_visible: true },
    orderBy: { created_at: "desc" },
    take: limit,
  })
  return rows.map(toEntity)
}
