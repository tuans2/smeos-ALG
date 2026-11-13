/**
 * IContentGenerationRepository — Port Interface cho Content Generations.
 *
 * Đặt tại domain/repositories/ theo chuẩn Clean Architecture (Zero ORM).
 */

import type { TenantContext } from "@/core/tenancy"
import type { content_generations } from "@/modules/content-engine/infra/entities"

export type ContentGenerationOrigin = "creative_studio" | "content_engine_ui" | "package_rewrite"
export type ContentGenerationMode = "AUTHENTIC" | "CREATIVE"
export type ContentGenerationStatus = "DRAFT" | "APPROVED" | "SCHEDULED"

export interface CreateContentGenerationInput {
  readonly jobId?: string | null | undefined
  readonly origin: ContentGenerationOrigin
  readonly assetId?: string | null | undefined
  readonly productId?: string | null | undefined
  readonly topicId?: string | null | undefined
  readonly scenePlanId?: string | null | undefined
  readonly mode?: ContentGenerationMode | null | undefined
  readonly channels: unknown
  readonly brief: unknown
  readonly briefVersion: number
  readonly promptVersions: unknown
  readonly rubricVersion: string
  readonly strategy?: unknown
  readonly posts: unknown
  readonly overallScore?: number | null | undefined
  readonly createdBy: string
}

export interface LatestContentGenerationFilter {
  readonly assetId?: string | null | undefined
  readonly topicId?: string | null | undefined
  readonly scenePlanId?: string | null | undefined
  readonly mode?: ContentGenerationMode | null | undefined
}

export interface ApproveContentGenerationInput {
  readonly approvedBy: string
  readonly approvedPosts: unknown
  readonly expectedStatus?: ContentGenerationStatus | undefined
}

export interface IContentGenerationRepository {
  create(ctx: TenantContext, input: CreateContentGenerationInput): Promise<content_generations>
  findById(ctx: TenantContext, id: string): Promise<content_generations | null>
  findLatest(ctx: TenantContext, filter: LatestContentGenerationFilter): Promise<content_generations | null>
  approve(ctx: TenantContext, id: string, input: ApproveContentGenerationInput): Promise<content_generations | null>
  markScheduled(ctx: TenantContext, id: string, socialPostIds: unknown): Promise<content_generations | null>
}
