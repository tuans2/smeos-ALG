import type { TenantContext } from "@/core/tenancy"
import type { RawKpiMetrics, KpiTimeWindow } from "../kpi-definitions"

export interface IMarketingKpiRepository {
  aggregateMetrics(
    ctx: TenantContext,
    options?: { timeWindow?: KpiTimeWindow | undefined }
  ): Promise<RawKpiMetrics>
}

