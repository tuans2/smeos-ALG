import { prisma } from "@/core/tenancy/infra/prisma"
import { customerTierThresholdsOf } from "@/modules/organization/domain/industry-customer-tiers"
import { industryKeyOf } from "@/modules/organization/domain/industry-key"
import { getIndustryPlugin } from "@/modules/organization/domain/industry-profile"
import { deriveCustomerTier } from "../domain/crm-rules"

const COUNTED_STATUSES = ["CONFIRMED", "PROCESSING", "DELIVERED", "COMPLETED"] as const

/**
 * Tính lại chỉ số và hạng của một khách từ đơn (PO 07/11/2026, kế hoạch logic nghiệp vụ Q6):
 *  - chi tiêu = tiền ĐÃ THU (`paid_vnd`) của các đơn chưa huỷ — không cộng phần còn nợ;
 *  - số đơn = đơn đã xác nhận trở đi;
 *  - ngưỡng hạng theo ngành của tiệm (`customerTiers` của plugin ngành).
 */
export async function syncCustomerMetrics(organizationId: string, customerId: string): Promise<void> {
  const [orders, org] = await Promise.all([
    prisma.orders.findMany({
      where: { organization_id: organizationId, customer_id: customerId, status: { not: "CANCELLED" } },
      select: { status: true, paid_vnd: true, created_at: true },
      orderBy: { created_at: "desc" },
    }),
    prisma.organizations.findUnique({ where: { id: organizationId }, select: { industry_key: true } }),
  ])
  const counted = orders.filter((o) => (COUNTED_STATUSES as readonly string[]).includes(o.status))
  const totalSpent = orders.reduce((sum, o) => sum + Number(o.paid_vnd), 0)
  const tier = deriveCustomerTier(totalSpent, counted.length, customerTierThresholdsOf(getIndustryPlugin(industryKeyOf(org))))
  await prisma.customers.updateMany({
    where: { id: customerId, organization_id: organizationId },
    data: { total_spent: totalSpent, order_count: counted.length, last_order_at: counted[0]?.created_at ?? null, tier },
  })
}

/**
 * Đơn có khách vừa đổi (trạng thái, tiền) từ `since` — mọi tổ chức, cho bộ quét nền; theo `(updated_at, id)`.
 * Có `afterId` thì lấy SAU dòng `(since, afterId)`: con trỏ hai thành phần nên hơn `take` đơn cùng một mốc giờ (cập nhật
 * hàng loạt) không làm bộ quét đứng mãi ở một trang (audit BL-31). Bên gọi tự bỏ khách trùng.
 */
export async function customersWithChangedOrders(since: Date, take: number, afterId?: string) {
  return prisma.orders.findMany({
    where: {
      customer_id: { not: null },
      ...(afterId ? { OR: [{ updated_at: { gt: since } }, { updated_at: since, id: { gt: afterId } }] } : { updated_at: { gte: since } }),
    },
    orderBy: [{ updated_at: "asc" }, { id: "asc" }],
    take,
    select: { id: true, organization_id: true, customer_id: true, updated_at: true },
  })
}
