import { prisma } from "@/core/tenancy/infra/prisma"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"

type Db = typeof prisma

/** Đọc dữ liệu cho phép kiểm khả dụng sản phẩm — mọi truy vấn lọc theo tổ chức. */
export class AvailabilityCheckRepository {
  constructor(private readonly db: Db = prisma) {}

  async findProduct(organizationId: string, productId: string) {
    return this.db.products.findFirst({
      where: { id: productId, organization_id: organizationId },
      select: {
        status: true,
        availability_config: true,
        branch_id: true,
        inventory: { select: { branch_id: true, status: true, quantity_available: true } },
      },
    })
  }

  async findOrganizationSettings(organizationId: string): Promise<unknown> {
    const row = await this.db.organizations.findFirst({
      where: { id: organizationId },
      select: ORG_SETTINGS_SELECT, // ngành theo cột (ADR-012 T-6c-1)
    })
    return row ? (withIndustryKey(row).settings ?? null) : null
  }

  /** Số đơn chưa huỷ có `delivery_window.date` đúng ngày. */
  async countActiveOrdersOnDate(organizationId: string, date: string): Promise<number> {
    return this.db.orders.count({
      where: {
        organization_id: organizationId,
        status: { not: "CANCELLED" },
        delivery_window: { path: ["date"], equals: date },
      },
    })
  }
}
