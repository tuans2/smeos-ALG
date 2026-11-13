/**
 * Content Generation Repository — bảng `content_generations` (TENANT, P27,
 * quyết định PO 25/09/2026). Một bản ghi mỗi lượt viết bài của Content
 * Engine: brief chụp sẵn, phiên bản prompt/rubric, bài theo từng kênh.
 *
 * Đợt 1 chỉ cần tạo/đọc/duyệt/đánh dấu đã gửi lịch đăng — chuỗi agent thật
 * (Strategist/Writer/Critic/Rewriter) là việc của Đợt 2 (`use-cases/generate-content.ts`).
 */

import { Prisma, type PrismaClient, type content_generations } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type {
  IContentGenerationRepository,
  CreateContentGenerationInput,
  LatestContentGenerationFilter,
  ApproveContentGenerationInput,
  ContentGenerationOrigin,
  ContentGenerationMode,
  ContentGenerationStatus,
} from "../domain/repositories/content-generation-repository.interface"

type DbClient = PrismaClient | Prisma.TransactionClient

export type {
  content_generations,
  IContentGenerationRepository,
  CreateContentGenerationInput,
  LatestContentGenerationFilter,
  ApproveContentGenerationInput,
  ContentGenerationOrigin,
  ContentGenerationMode,
  ContentGenerationStatus,
}

export class ContentGenerationRepository implements IContentGenerationRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(ctx: TenantContext, input: CreateContentGenerationInput): Promise<content_generations> {
    return this.db.content_generations.create({
      data: scopedData(ctx, {
        job_id: input.jobId ?? null,
        origin: input.origin,
        asset_id: input.assetId ?? null,
        product_id: input.productId ?? null,
        topic_id: input.topicId ?? null,
        scene_plan_id: input.scenePlanId ?? null,
        mode: input.mode ?? null,
        channels: input.channels as Prisma.InputJsonValue,
        brief: input.brief as Prisma.InputJsonValue,
        brief_version: input.briefVersion,
        prompt_versions: input.promptVersions as Prisma.InputJsonValue,
        rubric_version: input.rubricVersion,
        strategy: input.strategy === undefined ? Prisma.JsonNull : (input.strategy as Prisma.InputJsonValue),
        posts: input.posts as Prisma.InputJsonValue,
        overall_score: input.overallScore ?? null,
        status: "DRAFT" satisfies ContentGenerationStatus,
        created_by: input.createdBy,
      }),
    })
  }

  findById(ctx: TenantContext, id: string): Promise<content_generations | null> {
    return this.db.content_generations.findFirst({ where: scopedWhere(ctx, { id }) })
  }

  /** Bản mới nhất khớp bộ lọc — dùng cho `GET /generations?asset_id&topic_id&mode` (tra, không tạo job). */
  findLatest(ctx: TenantContext, filter: LatestContentGenerationFilter): Promise<content_generations | null> {
    const where: Prisma.content_generationsWhereInput = { trashed_at: null } // bản trong thùng rác không được dùng lại
    if (filter.assetId !== undefined) where.asset_id = filter.assetId
    if (filter.topicId !== undefined) where.topic_id = filter.topicId
    if (filter.scenePlanId !== undefined) where.scene_plan_id = filter.scenePlanId
    if (filter.mode !== undefined) where.mode = filter.mode

    return this.db.content_generations.findFirst({
      where: scopedWhere(ctx, where),
      orderBy: { created_at: "desc" },
    })
  }

  async approve(ctx: TenantContext, id: string, input: ApproveContentGenerationInput): Promise<content_generations | null> {
    const existing = await this.findById(ctx, id)
    if (!existing) return null
    const r = await this.db.content_generations.updateMany({
      where: scopedWhere(ctx, input.expectedStatus ? { id, status: input.expectedStatus } : { id }),
      data: {
        status: "APPROVED" satisfies ContentGenerationStatus,
        approved_by: input.approvedBy,
        approved_posts: input.approvedPosts as Prisma.InputJsonValue,
      },
    })
    if (r.count === 0) return null
    return this.findById(ctx, id)
  }

  /** Ghi lại đã gửi Lịch đăng — `social_post_ids` là mã bài bên SocialFlow theo từng kênh (Đợt 3). */
  async markScheduled(ctx: TenantContext, id: string, socialPostIds: unknown): Promise<content_generations | null> {
    const existing = await this.findById(ctx, id)
    if (!existing) return null
    await this.db.content_generations.updateMany({
      where: scopedWhere(ctx, { id }),
      data: {
        status: "SCHEDULED" satisfies ContentGenerationStatus,
        social_post_ids: socialPostIds as Prisma.InputJsonValue,
      },
    })
    return this.findById(ctx, id)
  }
}

let defaultRepo: IContentGenerationRepository | null = null

export function getContentGenerationRepository(db?: DbClient): IContentGenerationRepository {
  if (db) {
    return new ContentGenerationRepository(db)
  }
  if (!defaultRepo) {
    defaultRepo = new ContentGenerationRepository()
  }
  return defaultRepo
}
