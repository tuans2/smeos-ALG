import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { PrismaClient } from "@/generated/prisma/client"
import { STUCK_PUBLISHING_MS } from "../domain/post-lifecycle"

export interface NewSocialPost {
  readonly contentGenerationId: string | null
  readonly productId: string | null
  readonly channel: string
  readonly text: string
  readonly hashtags: readonly string[]
  readonly mediaAssetIds: readonly string[]
  readonly scheduledAt: Date
  readonly idempotencyKey: string
}

const VIEW = {
  id: true, organization_id: true, content_generation_id: true, product_id: true, channel: true, text: true, hashtags: true,
  media_asset_ids: true, status: true, scheduled_at: true, next_attempt_at: true, attempt_count: true, published_at: true,
  external_post_id: true, external_url: true, last_error_code: true, last_error_message: true, created_at: true,
} as const

/**
 * `social_posts` + `social_post_attempts`. Hàm nhận `ctx` lọc theo tổ chức (`scopedWhere`); hàm "hệ thống" (không
 * `ctx`) chỉ gọi từ lượt cron đăng bài đến hạn, và mọi lệnh ghi của nó khoá theo `id` + trạng thái mong đợi.
 */
export class SocialPostRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  /** Tạo bài; trùng khoá chống trùng thì bỏ qua (bấm hai lần không đăng hai lần). Trả bài theo các khoá. */
  async createMany(ctx: TenantContext, posts: readonly NewSocialPost[]) {
    await this.db.social_posts.createMany({
      data: posts.map((p) => scopedData(ctx, {
        content_generation_id: p.contentGenerationId,
        product_id: p.productId,
        channel: p.channel,
        text: p.text,
        hashtags: [...p.hashtags],
        media_asset_ids: [...p.mediaAssetIds],
        scheduled_at: p.scheduledAt,
        idempotency_key: p.idempotencyKey,
        created_by: ctx.userId,
      })),
      skipDuplicates: true,
    })
    return this.db.social_posts.findMany({
      where: scopedWhere(ctx, { idempotency_key: { in: posts.map((p) => p.idempotencyKey) } }),
      orderBy: [{ scheduled_at: "asc" }, { id: "asc" }],
      select: VIEW,
    })
  }

  list(ctx: TenantContext, opts: { limit: number; cursor?: string | undefined; status?: string | undefined; contentGenerationId?: string | undefined }) {
    return this.db.social_posts.findMany({
      where: scopedWhere(ctx, {
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.contentGenerationId ? { content_generation_id: opts.contentGenerationId } : {}),
      }),
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: opts.limit + 1,
      ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
      select: VIEW,
    })
  }

  findById(ctx: TenantContext, id: string) {
    return this.db.social_posts.findFirst({ where: scopedWhere(ctx, { id }), select: VIEW })
  }

  /** Huỷ: chỉ bài đang chờ của chính tổ chức. */
  async cancel(ctx: TenantContext, id: string): Promise<boolean> {
    const r = await this.db.social_posts.updateMany({ where: scopedWhere(ctx, { id, status: "QUEUED" }), data: { status: "CANCELED", next_attempt_at: null } })
    return r.count === 1
  }

  /** Thử lại tay: bài đã dừng vì lỗi → chờ đăng ngay, cấp lại đủ lượt thử. */
  async retry(ctx: TenantContext, id: string, now: Date): Promise<boolean> {
    const r = await this.db.social_posts.updateMany({
      where: scopedWhere(ctx, { id, status: "FAILED" }),
      data: { status: "QUEUED", attempt_count: 0, next_attempt_at: now, last_error_code: null, last_error_message: null },
    })
    return r.count === 1
  }

  // ── Hệ thống (lượt cron) ───────────────────────────────────────────────────────────────────────────────

  /** Bài "PUBLISHING" treo quá lâu (tiến trình chết giữa chừng) → trả về hàng đợi để thử lại. */
  async recoverStuck(now: Date): Promise<number> {
    const r = await this.db.social_posts.updateMany({
      where: { status: "PUBLISHING", updated_at: { lt: new Date(now.getTime() - STUCK_PUBLISHING_MS) } },
      data: { status: "QUEUED", next_attempt_at: now },
    })
    return r.count
  }

  /** Bài đến hạn (xuyên tổ chức), cũ trước. */
  listDue(now: Date, limit: number) {
    return this.db.social_posts.findMany({
      where: {
        status: "QUEUED",
        OR: [{ next_attempt_at: { lte: now } }, { next_attempt_at: null, scheduled_at: { lte: now } }],
      },
      orderBy: [{ scheduled_at: "asc" }, { id: "asc" }],
      take: limit,
      select: VIEW,
    })
  }

  /** Nhận việc: QUEUED → PUBLISHING và tăng số lần thử; false = tiến trình khác đã nhận. */
  async claim(id: string, attemptCount: number): Promise<boolean> {
    const r = await this.db.social_posts.updateMany({
      where: { id, status: "QUEUED", attempt_count: attemptCount },
      data: { status: "PUBLISHING", attempt_count: { increment: 1 } },
    })
    return r.count === 1
  }

  async finish(
    post: { id: string; organization_id: string },
    attemptNo: number,
    outcome:
      | { kind: "PUBLISHED"; externalId: string; url: string | null; at: Date }
      | { kind: "RETRY"; code: string; message: string; nextAttemptAt: Date }
      | { kind: "FAILED"; code: string; message: string },
    durationMs: number,
  ): Promise<void> {
    const data =
      outcome.kind === "PUBLISHED"
        ? { status: "PUBLISHED", published_at: outcome.at, external_post_id: outcome.externalId, external_url: outcome.url, next_attempt_at: null, last_error_code: null, last_error_message: null }
        : outcome.kind === "RETRY"
          ? { status: "QUEUED", next_attempt_at: outcome.nextAttemptAt, last_error_code: outcome.code, last_error_message: outcome.message }
          : { status: "FAILED", next_attempt_at: null, last_error_code: outcome.code, last_error_message: outcome.message }
    await this.db.$transaction([
      this.db.social_posts.updateMany({ where: { id: post.id, status: "PUBLISHING" }, data }),
      this.db.social_post_attempts.create({
        data: {
          organization_id: post.organization_id,
          social_post_id: post.id,
          attempt_no: attemptNo,
          outcome: outcome.kind,
          error_code: outcome.kind === "PUBLISHED" ? null : outcome.code,
          error_message: outcome.kind === "PUBLISHED" ? null : outcome.message.slice(0, 500),
          external_post_id: outcome.kind === "PUBLISHED" ? outcome.externalId : null,
          duration_ms: durationMs,
        },
      }),
    ])
  }
}

export type SocialPostRow = Awaited<ReturnType<SocialPostRepository["listDue"]>>[number]

let instance: SocialPostRepository | null = null
export function getSocialPostRepository(db?: PrismaClient): SocialPostRepository {
  if (db) return new SocialPostRepository(db)
  instance ??= new SocialPostRepository()
  return instance
}
