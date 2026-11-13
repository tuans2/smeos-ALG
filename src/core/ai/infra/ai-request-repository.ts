import { prisma } from "@/core/tenancy/infra/prisma"
import type { TenantContext } from "@/core/tenancy"

import type { ai_requests } from "./entities"
import type { DbClient } from "./db-client"
import type { IAiRequestRepository } from "../domain/ai-repository.interface"

export type RecordAiRequestInput = {
  capability_code: string
  model_key: string
  outcome: "ACCEPTED" | "ESCALATED" | "FAILED" | "NEEDS_REVIEW"
  source: "CORE" | "LOCALBUDD" | "SOCIALFLOW"
  attempt?: number
  escalated_from?: string | null
  fallback_from?: string | null
  job_id?: string | null
  input_tokens?: number | null
  output_tokens?: number | null
  image_count?: number | null
  duration_seconds?: number | null
  gpu_seconds?: number | null
  cost_usd?: number | null
  latency_ms?: number | null
  quality_score?: number | null
}

/**
 * Sổ chi phí mỗi lời gọi mô hình — CHỈ GHI THÊM.
 *
 * Không nhận prompt lẫn đầu ra: prompt của một lượt sinh nằm ở metadata của
 * asset, gác bằng năng lực đọc asset. Bảng này để trả lời "mô hình nào đang
 * đắt hơn giá trị nó tạo ra", không để dựng lại nội dung đã sinh.
 *
 * Nó KHÔNG thay `usage`: hạn mức vẫn kiểm tại điểm tạo job, và một lượt nghiệp
 * vụ vẫn trừ đúng số credit đã công bố dù bên dưới gọi mô hình ba lần
 * (`YC-G13`).
 */
export class AiRequestRepository implements IAiRequestRepository {
  constructor(private readonly db: DbClient = prisma) {}

  record(ctx: TenantContext, input: RecordAiRequestInput): Promise<ai_requests> {
    return this.db.ai_requests.create({
      data: {
        organization_id: ctx.organizationId,
        capability_code: input.capability_code,
        model_key: input.model_key,
        outcome: input.outcome,
        source: input.source,
        attempt: input.attempt ?? 1,
        escalated_from: input.escalated_from ?? null,
        fallback_from: input.fallback_from ?? null,
        job_id: input.job_id ?? null,
        input_tokens: input.input_tokens ?? null,
        output_tokens: input.output_tokens ?? null,
        image_count: input.image_count ?? null,
        duration_seconds: input.duration_seconds ?? null,
        gpu_seconds: input.gpu_seconds ?? null,
        cost_usd: input.cost_usd ?? null,
        latency_ms: input.latency_ms ?? null,
        quality_score: input.quality_score ?? null,
      },
    })
  }

  list(
    ctx: TenantContext,
    filter: {
      capability_code?: string | undefined
      from?: Date | undefined
      to?: Date | undefined
      limit?: number | undefined
    } = {}
  ): Promise<ai_requests[]> {
    return this.db.ai_requests.findMany({
      where: {
        organization_id: ctx.organizationId,
        ...(filter.capability_code ? { capability_code: filter.capability_code } : {}),
        ...(filter.from || filter.to
          ? {
              created_at: {
                ...(filter.from ? { gte: filter.from } : {}),
                ...(filter.to ? { lte: filter.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { created_at: "desc" },
      take: Math.min(filter.limit ?? 100, 5000),
    })
  }

  listReviewQueue(
    ctx: TenantContext,
    limit = 100
  ): Promise<ai_requests[]> {
    return this.db.ai_requests.findMany({
      where: {
        organization_id: ctx.organizationId,
        outcome: { in: ["NEEDS_REVIEW", "ESCALATED"] },
      },
      orderBy: { created_at: "desc" },
      take: Math.min(limit, 5000),
    })
  }

  getById(ctx: TenantContext, id: string): Promise<ai_requests | null> {
    return this.db.ai_requests.findFirst({
      where: {
        id,
        organization_id: ctx.organizationId,
      },
    })
  }

  updateOutcome(
    ctx: TenantContext,
    id: string,
    outcome: "ACCEPTED" | "FAILED" | "NEEDS_REVIEW"
  ): Promise<ai_requests | null> {
    return this.db.ai_requests.update({
      where: { id },
      data: { outcome },
    })
  }
}

let aiRequestRepoInstance: IAiRequestRepository | null = null

export function getAiRequestRepository(db?: DbClient): IAiRequestRepository {
  if (db) return new AiRequestRepository(db)
  if (!aiRequestRepoInstance) {
    aiRequestRepoInstance = new AiRequestRepository()
  }
  return aiRequestRepoInstance!
}
