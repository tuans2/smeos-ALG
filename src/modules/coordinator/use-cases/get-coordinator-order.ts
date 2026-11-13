/**
 * Use-case: chi tiết một đơn điều phối (F04, R1). Tổ chức khác → 404.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { CoordinatorOrderView } from "./present-coordinator-order"
import { getOrderView } from "./shared"

export function getCoordinatorOrder(ctx: TenantContext, idOrCode: string): Promise<CoordinatorOrderView> {
  return getOrderView(ctx, idOrCode)
}
