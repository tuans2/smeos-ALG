/**
 * Hạ tầng cho đặt hàng công khai từ catalog/landing (P3 — §3.2). Không có phiên: tổ chức luôn do use-case suy
 * từ catalog, mọi truy vấn ở đây lọc theo `organizationId` đó.
 */

import { prisma } from "@/core/tenancy/infra/prisma"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { OPEN_LEAD_STATUSES } from "@/modules/acquisition/domain/lead-recovery"
import { phoneEquals } from "@/core/security/pii-lookup"

export class PublicOrderRepository {
  async orgSettings(organizationId: string): Promise<unknown> {
    const org = await prisma.organizations.findUnique({ where: { id: organizationId }, select: ORG_SETTINGS_SELECT })
    return org ? (withIndustryKey(org).settings ?? null) : null // ngành theo cột (ADR-012 T-6c-1)
  }

  /** Đơn công khai (catalog/landing) của cùng SĐT trong khoảng gần đây — chặn gửi dồn. */
  async countRecentByPhone(organizationId: string, phone: string, since: Date): Promise<number> {
    return prisma.orders.count({
      where: { organization_id: organizationId, source: { in: ["CATALOG", "LANDING"] }, created_at: { gte: since }, customer: phoneEquals(organizationId, phone) }, // P-5b
    })
  }

  /** Lead đang mở của cùng SĐT — đơn gắn vào lead đó (§3.1: "khách bấm Đặt hàng → gắn vào lead đang mở"). */
  async openLeadId(organizationId: string, phone: string): Promise<string | null> {
    const lead = await prisma.leads.findFirst({
      where: { organization_id: organizationId, status: { in: [...OPEN_LEAD_STATUSES] }, converted_order_id: null, AND: [phoneEquals(organizationId, phone)] }, // P-5b
      orderBy: { created_at: "desc" },
      select: { id: true },
    })
    return lead?.id ?? null
  }
}
