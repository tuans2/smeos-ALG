/**
 * Bàn làm việc đơn ngoài Thẻ chào (P4): đơn chưa vào Điều phối hoặc còn phải thu. Chỉ đọc, lọc theo tổ chức.
 * Đơn `BROCHURE` không có ở đây — Thẻ chào có màn riêng được nhúng nguyên vẹn (B1, B3).
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"

export const WORKBENCH_MAX = 100

export class WorkbenchRepository {
  async list(ctx: TenantContext, saleId: string | null) {
    return prisma.orders.findMany({
      where: scopedWhere(ctx, {
        NOT: { source: "BROCHURE" },
        status: { in: ["DRAFT" as const, "CONFIRMED" as const, "PROCESSING" as const, "DELIVERED" as const] },
        OR: [{ coordination: { is: null } }, { balance_vnd: { gt: 0 } }],
        ...(saleId ? { AND: [{ OR: [{ owner_sale_id: saleId }, { owner_sale_id: null }] }] } : {}),
        ...branchScopedWhere(ctx),
      }),
      orderBy: { created_at: "desc" },
      take: WORKBENCH_MAX,
      select: {
        id: true, code: true, source: true, status: true, delivery_status: true, total_vnd: true, paid_vnd: true, balance_vnd: true,
        delivery_address: true, delivery_window: true, created_at: true, owner_sale_id: true,
        coordination: { select: { id: true } },
        approval_requests: {
          where: { kind: "DELIVER_BEFORE_PAY" },
          orderBy: { created_at: "desc" },
          take: 1,
          select: { id: true, status: true, basis: true, collect_due_at: true },
        },
      },
    })
  }
}
