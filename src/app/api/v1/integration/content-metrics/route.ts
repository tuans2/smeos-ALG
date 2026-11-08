import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import {
  requireIntegrationContext,
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { recordContentMetrics } from "@/modules/integration/use-cases/record-content-metrics"
import { contentMetricsBody } from "@/modules/integration/contracts/http-requests"

/**
 * `POST /integration/content-metrics` (đặc tả 06 mục 11): "Ghi số liệu hiệu quả nội dung".
 * Idempotent theo khoá tự nhiên 4 cột: organization_id, platform, content_id, metric_date (YC-L1).
 * Engine ngoài gọi khi hoàn tất một lượt đăng bài/quảng cáo.
 */
export const POST = handle(async (request) => {
  const ic = await requireIntegrationContext(request)
  const ctx = await toTenantContext(ic)

  const parsed = contentMetricsBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  const row = await recordContentMetrics(ctx, {
    platform: parsed.data.platform,
    contentId: parsed.data.content_id,
    metricDate: parsed.data.metric_date,
    reach: parsed.data.reach ?? null,
    impressions: parsed.data.impressions ?? null,
    engagement: parsed.data.engagement ?? null,
    clicks: parsed.data.clicks ?? null,
    conversions: parsed.data.conversions ?? null,
    spendUsd: parsed.data.spend_usd ?? null,
  })

  return jsonResponse(row, { status: 201 })
})