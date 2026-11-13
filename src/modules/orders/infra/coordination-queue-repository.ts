/**
 * Đơn ngoài Thẻ chào đang trong Điều phối (P4 — tab Điều phối của mục Đơn hàng). Chỉ đọc, lọc theo tổ chức.
 * Đơn Thẻ chào có bảng Điều phối riêng được nhúng nguyên vẹn — không lặp lại ở đây.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { RECIPIENT_VIEW_SELECT, withDeliveryView } from "./order-recipient-view"

export const COORDINATION_QUEUE_MAX = 100

export class CoordinationQueueRepository {
  async list(ctx: TenantContext) {
    const rows = await prisma.order_coordinations.findMany({
      where: scopedWhere(ctx, {
        stage: { notIn: ["COMPLETED" as const, "CANCELLED" as const] },
        order: { NOT: { source: "BROCHURE" }, ...branchScopedWhere(ctx) },
      }),
      orderBy: [{ next_action_due: "asc" }, { created_at: "asc" }],
      take: COORDINATION_QUEUE_MAX,
      select: {
        stage: true, risk_level: true, next_action: true, next_action_due: true,
        order: { select: { id: true, code: true, source: true, balance_vnd: true, delivery_window: true, delivery_address: true, recipient: RECIPIENT_VIEW_SELECT } },
      },
    })
    return rows.map((r) => ({ ...r, order: withDeliveryView(r.order) })) // P-3b: người nhận từ order_recipients
  }
}
