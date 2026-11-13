import type { DbClient } from "./db-client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedWhere, type TenantContext } from "@/core/tenancy"
import type { content_metrics } from "./entities"
import type {
  IContentMetricsRepository,
} from "../domain/repositories/integration-repository.interface"

export class ContentMetricsRepository implements IContentMetricsRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async upsertByNaturalKey(ctx: TenantContext, input: {
    platform: string
    contentId: string
    metricDate: Date
    reach?: number | null
    impressions?: number | null
    engagement?: number | null
    clicks?: number | null
    conversions?: number | null
    spendUsd?: number | null
  }) {
    return this.db.content_metrics.upsert({
      where: {
        organization_id_platform_content_id_metric_date: {
          organization_id: ctx.organizationId,
          platform: input.platform,
          content_id: input.contentId,
          metric_date: input.metricDate,
        },
      },
      update: {
        reach: input.reach ?? null,
        impressions: input.impressions ?? null,
        engagement: input.engagement ?? null,
        clicks: input.clicks ?? null,
        conversions: input.conversions ?? null,
        spend_usd: input.spendUsd ?? null,
        updated_at: new Date(),
      },
      create: {
        organization_id: ctx.organizationId,
        platform: input.platform,
        content_id: input.contentId,
        metric_date: input.metricDate,
        reach: input.reach ?? null,
        impressions: input.impressions ?? null,
        engagement: input.engagement ?? null,
        clicks: input.clicks ?? null,
        conversions: input.conversions ?? null,
        spend_usd: input.spendUsd ?? null,
      },
    })
  }
}

let contentMetricsRepoInstance: IContentMetricsRepository | null = null

export function getContentMetricsRepository(db?: DbClient): IContentMetricsRepository {
  if (db) return new ContentMetricsRepository(db)
  if (!contentMetricsRepoInstance) {
    contentMetricsRepoInstance = new ContentMetricsRepository()
  }
  return contentMetricsRepoInstance
}