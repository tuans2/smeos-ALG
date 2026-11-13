import type { IAiRequestRepository } from "@/core/ai/domain/ai-repository.interface"
import { getAiRequestRepository } from "@/core/ai/infra/ai-request-repository"
import type { TenantContext } from "@/core/tenancy"

export type AiRequestFilter = {
  capability_code?: string | undefined
  from?: Date | undefined
  to?: Date | undefined
  limit?: number | undefined
}

/**
 * `GET /ai-requests` (`U3`) và `GET /ai-requests/summary`.
 *
 * Đây là bảng trả lời "mô hình nào đang đắt hơn giá trị nó tạo ra", nên phần
 * tổng hợp gom theo NĂNG LỰC và theo MÔ HÌNH — gom theo `feature` của `usage`
 * thì không phân biệt được hai mô hình chạy cùng một năng lực.
 *
 * Đáp ứng không bao giờ mang prompt hay đầu ra: bảng không giữ chúng.
 */
export async function listAiRequests(
  ctx: TenantContext,
  filter: AiRequestFilter = {},
  repo: IAiRequestRepository = getAiRequestRepository()
) {
  const rows = await repo.list(ctx, filter)
  return {
    data: rows.map((row) => ({
      id: row.id,
      capability_code: row.capability_code,
      model_key: row.model_key,
      attempt: row.attempt,
      escalated_from: row.escalated_from,
      fallback_from: row.fallback_from,
      outcome: row.outcome,
      source: row.source,
      cost_usd: row.cost_usd,
      latency_ms: row.latency_ms,
      quality_score: row.quality_score,
      job_id: row.job_id,
      created_at: row.created_at,
    })),
  }
}

export async function summarizeAiRequests(
  ctx: TenantContext,
  filter: AiRequestFilter = {},
  repo: IAiRequestRepository = getAiRequestRepository()
) {
  const rows = await repo.list(ctx, { ...filter, limit: 5000 })

  const buckets = new Map<
    string,
    {
      capability_code: string
      model_key: string
      calls: number
      accepted: number
      escalated: number
      failed: number
      needs_review: number
      cost_usd: number
      latency_ms_total: number
      latency_samples: number
      quality_total: number
      quality_samples: number
    }
  >()

  for (const row of rows) {
    const key = `${row.capability_code}::${row.model_key}`
    const bucket =
      buckets.get(key) ??
      {
        capability_code: row.capability_code,
        model_key: row.model_key,
        calls: 0,
        accepted: 0,
        escalated: 0,
        failed: 0,
        needs_review: 0,
        cost_usd: 0,
        latency_ms_total: 0,
        latency_samples: 0,
        quality_total: 0,
        quality_samples: 0,
      }

    bucket.calls += 1
    if (row.outcome === "ACCEPTED") bucket.accepted += 1
    if (row.outcome === "ESCALATED") bucket.escalated += 1
    if (row.outcome === "FAILED") bucket.failed += 1
    if (row.outcome === "NEEDS_REVIEW") bucket.needs_review += 1
    if (typeof row.cost_usd === "number") bucket.cost_usd += row.cost_usd
    if (typeof row.latency_ms === "number") {
      bucket.latency_ms_total += row.latency_ms
      bucket.latency_samples += 1
    }
    if (typeof row.quality_score === "number") {
      bucket.quality_total += row.quality_score
      bucket.quality_samples += 1
    }
    buckets.set(key, bucket)
  }

  return {
    data: [...buckets.values()].map((bucket) => ({
      capability_code: bucket.capability_code,
      model_key: bucket.model_key,
      calls: bucket.calls,
      accepted: bucket.accepted,
      escalated: bucket.escalated,
      failed: bucket.failed,
      needs_review: bucket.needs_review,
      cost_usd: Number(bucket.cost_usd.toFixed(6)),
      latency_ms_avg:
        bucket.latency_samples > 0
          ? Math.round(bucket.latency_ms_total / bucket.latency_samples)
          : null,
      quality_score_avg:
        bucket.quality_samples > 0
          ? Number((bucket.quality_total / bucket.quality_samples).toFixed(4))
          : null,
      /** Tỷ lệ phải leo thác — số đo nói mô hình này có đủ cho việc hay không. */
      escalation_rate: Number((bucket.escalated / bucket.calls).toFixed(4)),
    })),
  }
}
