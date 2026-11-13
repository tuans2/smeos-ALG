import { prisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_ORGANIZATION_ONLY } from "@/modules/organization/infra/active-organization-filter"

/** Đơn tạo quá ngần này mà vẫn mở thì coi như đơn treo, không quét nhắc giao. */
const LOOKBACK_DAYS = 60

/**
 * Truy vấn XUYÊN tổ chức cho cron nhắc giao (checklist 4.32, gác bằng CRON_SECRET, không có phiên tenant).
 * Chỉ trả mã tổ chức có đơn đang mở; đọc đơn của từng tổ chức đi qua repository có phạm vi tenant.
 */
export async function listOrganizationsWithOpenOrders(now: Date, limit: number): Promise<string[]> {
  const rows = await prisma.orders.findMany({
    where: {
      status: { notIn: ["COMPLETED", "CANCELLED"] },
      created_at: { gte: new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60_000) },
      ...ACTIVE_ORGANIZATION_ONLY, // UJ-26
    },
    distinct: ["organization_id"],
    select: { organization_id: true },
    orderBy: { organization_id: "asc" },
    take: limit,
  })
  return rows.map((r) => r.organization_id)
}
