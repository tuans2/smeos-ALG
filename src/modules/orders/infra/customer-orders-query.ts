/** Đơn đã đặt của một khách (checklist ALG 4.11) — mọi nguồn, theo khách đã gắn hoặc cùng số điện thoại người đặt. */

import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedWhere } from "@/core/tenancy"
import { scopedWhere, type TenantContext } from "@/core/tenancy/tenant-context"
import { customerBranchWhere } from "@/modules/crm/infra/customer-branch-scope"
import { phoneEquals } from "@/core/security/pii-lookup"

export const CUSTOMER_ORDERS_MAX = 50

export async function findCustomerForOrders(ctx: TenantContext, customerId: string) {
  return prisma.customers.findFirst({ where: scopedWhere(ctx, { id: customerId, status: "ACTIVE" as const, ...(await customerBranchWhere(ctx)) }), select: { id: true, phone: true } })
}

export async function listOrdersOfCustomer(ctx: TenantContext, customer: { id: string; phone: string | null }) {
  const phone = customer.phone?.replace(/[\s.-]+/g, "") || null
  return prisma.orders.findMany({
    where: scopedWhere(ctx, {
      ...branchScopedWhere(ctx),
      OR: [
        { customer_id: customer.id },
        ...(phone
          ? [
              { customer_id: null, greeting_sessions: { some: phoneEquals(ctx.organizationId, phone, "customer_phone") } }, // P-5b
              // P-5c: SĐT khách lẻ của đơn điều phối ở `customer_phone` (bản mã) + băm; đơn cũ chưa qua job còn ở metadata
              { customer_id: null, coordination: { is: { OR: [phoneEquals(ctx.organizationId, phone, "customer_phone"), { customer_phone_hash: null, metadata: { path: ["customerPhone"], equals: phone } }] } } },
            ]
          : []),
      ],
    }),
    orderBy: { created_at: "desc" },
    take: CUSTOMER_ORDERS_MAX,
    select: {
      id: true, code: true, source: true, status: true, delivery_status: true, total_vnd: true, balance_vnd: true,
      created_at: true, delivery_window: true, items: { select: { description: true, quantity: true }, take: 3 },
    },
  })
}
