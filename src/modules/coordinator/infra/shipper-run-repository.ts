/**
 * Đơn đang giao của shipper nội bộ (checklist ALG 4.5). Chỉ đọc trường cần cho việc giao — không giá,
 * không ghi chú nội bộ, không thông tin người đặt.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { RECIPIENT_VIEW_SELECT, withDeliveryView } from "@/modules/orders/infra/order-recipient-view"

export const SHIPPER_RUNS_SCAN_MAX = 200

export class ShipperRunRepository {
  async currentUser(ctx: TenantContext): Promise<{ name: string; phone: string | null }> {
    const user = await prisma.users.findUniqueOrThrow({ where: { id: ctx.userId }, select: { name: true, email: true, phone: true } })
    return { name: user.name ?? user.email, phone: user.phone }
  }

  async dispatching(ctx: TenantContext) {
    const rows = await prisma.order_coordinations.findMany({
      where: scopedWhere(ctx, { stage: "DISPATCHING" as const, order: { ...branchScopedWhere(ctx) } }),
      orderBy: { estimated_delivery_at: "asc" },
      take: SHIPPER_RUNS_SCAN_MAX,
      select: {
        shipper_phone: true, delivery_state: true, estimated_delivery_at: true, metadata: true,
        order: { select: { id: true, code: true, card_message: true, delivery_address: true, delivery_window: true, recipient: RECIPIENT_VIEW_SELECT } },
      },
    })
    return rows.map((r) => ({ ...r, order: withDeliveryView(r.order) })) // P-3b: người nhận từ order_recipients
  }
}
