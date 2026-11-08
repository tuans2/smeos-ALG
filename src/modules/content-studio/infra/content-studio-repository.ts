import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { DbClient } from "@/modules/products/infra/db-client"

/**
 * Đọc dữ liệu đã có của một sản phẩm cho hành trình Tạo nội dung (Bước 1–3) — mọi truy vấn lọc theo tổ chức
 * (`scopedWhere`). Không ghi: ghi đi qua use-case sẵn có của sản phẩm / bài giới thiệu.
 */
export class ContentStudioRepository {
  constructor(private readonly db: DbClient = prisma) {}

  /** Bản quét ảnh mới nhất gắn với sản phẩm — ưu tiên bản đã duyệt. */
  async latestAnalysis(ctx: TenantContext, productId: string) {
    const approved = await this.db.product_analyses.findFirst({
      where: scopedWhere(ctx, { product_id: productId, approval_state: "APPROVED" as const }),
      orderBy: [{ approved_at: "desc" }, { created_at: "desc" }],
    })
    if (approved) return approved
    return this.db.product_analyses.findFirst({
      where: scopedWhere(ctx, { product_id: productId }),
      orderBy: [{ created_at: "desc" }],
    })
  }

  /** Kết quả quét của một lượt (mỗi ảnh một dòng) — trần 20 dòng, lớn hơn trần ảnh mỗi lần tải. */
  analysesOfJob(ctx: TenantContext, jobId: string) {
    return this.db.product_analyses.findMany({
      where: scopedWhere(ctx, { job_id: jobId }),
      orderBy: [{ created_at: "asc" }, { id: "asc" }],
      take: 20,
      select: { id: true },
    })
  }

  /** Bài giới thiệu mới nhất của sản phẩm — ưu tiên bản đã duyệt. */
  async latestCopy(ctx: TenantContext, productId: string) {
    const approved = await this.db.product_copies.findFirst({
      where: scopedWhere(ctx, { product_id: productId, approval_state: "APPROVED" as const }),
      orderBy: [{ approved_at: "desc" }, { created_at: "desc" }],
    })
    if (approved) return approved
    return this.db.product_copies.findFirst({
      where: scopedWhere(ctx, { product_id: productId }),
      orderBy: [{ created_at: "desc" }],
    })
  }

  /** Số lượt bài đăng đa kênh đã duyệt (hoặc đã lên lịch) của sản phẩm; bỏ bản trong thùng rác. */
  countApprovedPosts(ctx: TenantContext, productId: string) {
    return this.db.content_generations.count({
      where: scopedWhere(ctx, { product_id: productId, status: { in: ["APPROVED", "SCHEDULED"] }, trashed_at: null }),
    })
  }

  /** Lượt bài đăng đa kênh mới nhất của sản phẩm (bỏ bản trong thùng rác). */
  latestGeneration(ctx: TenantContext, productId: string) {
    return this.db.content_generations.findFirst({
      where: scopedWhere(ctx, { product_id: productId, trashed_at: null }),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      select: { id: true, status: true, channels: true, posts: true, approved_posts: true, overall_score: true, created_at: true },
    })
  }

  /** Mã sản phẩm có Bài giới thiệu đã duyệt — trong một danh sách cho trước. */
  async productsWithApprovedCopy(ctx: TenantContext, productIds: readonly string[]): Promise<Set<string>> {
    if (productIds.length === 0) return new Set()
    const rows = await this.db.product_copies.findMany({
      where: scopedWhere(ctx, { product_id: { in: [...productIds] }, approval_state: "APPROVED" as const }),
      select: { product_id: true },
      distinct: ["product_id"],
    })
    return new Set(rows.map((r) => r.product_id).filter((id): id is string => Boolean(id)))
  }
}

let instance: ContentStudioRepository | null = null

export function getContentStudioRepository(db?: DbClient): ContentStudioRepository {
  if (db) return new ContentStudioRepository(db)
  instance ??= new ContentStudioRepository()
  return instance
}
