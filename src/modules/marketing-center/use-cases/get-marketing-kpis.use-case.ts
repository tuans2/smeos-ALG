import type { TenantContext } from "@/core/tenancy"
import {
  buildModuleKpis,
  type BusinessModuleKey,
  type KpiTimeWindow,
  type ModuleKpiStrip,
} from "../domain/kpi-definitions"
import type { IMarketingKpiRepository } from "../domain/repositories/marketing-kpi-repository.interface"
import { getMarketingKpiRepository } from "../infra/marketing-kpi-repository"

export interface GetMarketingKpisOptions {
  timeWindow?: KpiTimeWindow | undefined
}

export async function getMarketingKpisUseCase(
  ctx: TenantContext,
  options?: GetMarketingKpisOptions,
  repo: IMarketingKpiRepository = getMarketingKpiRepository()
): Promise<Record<BusinessModuleKey, ModuleKpiStrip>> {
  const rawMetrics = await repo.aggregateMetrics(ctx, {
    timeWindow: options?.timeWindow,
  })

  return buildModuleKpis(rawMetrics)
}

