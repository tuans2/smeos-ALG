import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import type { IContentMetricsRepository } from "../domain/repositories/integration-repository.interface"
import { getContentMetricsRepository } from "../infra/content-metrics-repository"

export type ContentMetricsInput = {
  platform: string
  contentId: string
  metricDate: string // ISO date YYYY-MM-DD
  reach?: number | null
  impressions?: number | null
  engagement?: number | null
  clicks?: number | null
  conversions?: number | null
  spendUsd?: number | null
}

/**
 * `POST /integration/content-metrics` (đặc tả 06 mục 11): "Ghi số liệu hiệu quả nội dung".
 * Idempotent theo khoá tự nhiên 4 cột: organization_id, platform, content_id, metric_date (YC-L1).
 * Engine ngoài gọi khi hoàn tất một lượt đăng bài/quảng cáo.
 */
export async function recordContentMetrics(
  ctx: TenantContext,
  input: ContentMetricsInput,
  repo: IContentMetricsRepository = getContentMetricsRepository()
) {
  const metricDate = new Date(input.metricDate)
  if (isNaN(metricDate.getTime())) throw validationFailed({ metric_date: "Ngày không hợp lệ" })

  return repo.upsertByNaturalKey(ctx, {
    platform: input.platform,
    contentId: input.contentId,
    metricDate,
    reach: input.reach ?? null,
    impressions: input.impressions ?? null,
    engagement: input.engagement ?? null,
    clicks: input.clicks ?? null,
    conversions: input.conversions ?? null,
    spendUsd: input.spendUsd ?? null,
  })
}