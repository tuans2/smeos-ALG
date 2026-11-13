/**
 * Use-case: danh sách đơn Control Tower (F03, R1). Rủi ro tính lại lúc đọc.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CoordinatorStage } from "../domain/coordinator-types"
import type { ICoordinatorRepository } from "../domain/repositories/coordinator-repository.interface"
import { getCoordinatorRepository, type CoordinatorOrderRow } from "../infra/coordinator-repository"
import { sortByRisk } from "../domain/risk-order"
import { presentCoordinatorOrders, type CoordinatorOrderView } from "./present-coordinator-order"

export async function listCoordinatorOrders(
  ctx: TenantContext,
  options: { stage?: CoordinatorStage | undefined; limit: number },
  repo: ICoordinatorRepository<CoordinatorOrderRow> = getCoordinatorRepository()
): Promise<CoordinatorOrderView[]> {
  const rows = await repo.listOrders(ctx, options)
  // Đơn nguy cơ trễ lên đầu (checklist ALG 4.12)
  return sortByRisk(await presentCoordinatorOrders(ctx, rows))
}
