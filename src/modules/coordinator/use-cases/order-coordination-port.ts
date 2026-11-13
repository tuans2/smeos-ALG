/**
 * Cổng cho sổ đơn (`orders`) hỏi/huỷ đơn đang ở Điều phối mà không tự sửa `order_coordinations`.
 * Audit BL-04 (06/11/2026): huỷ ở sổ đơn từng chỉ đổi `orders.status` — đơn đã huỷ vẫn nằm trên bảng
 * điều phối và vẫn bị đếm vào công suất đối tác.
 */

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { getCoordinatorRepository } from "../infra/coordinator-repository"
import { cancelCoordinatorOrder } from "./operations"

export interface OrderCoordinationPort {
  isUnderCoordination(ctx: TenantContext, orderId: string): Promise<boolean>
  cancel(ctx: TenantContext, orderId: string, reason: string): Promise<void>
}

export const orderCoordinationPort: OrderCoordinationPort = {
  async isUnderCoordination(ctx, orderId) {
    const row = await getCoordinatorRepository().findOrder(ctx, orderId)
    return Boolean(row?.coordination)
  },
  async cancel(ctx, orderId, reason) {
    await cancelCoordinatorOrder(ctx, orderId, { reason })
  },
}
