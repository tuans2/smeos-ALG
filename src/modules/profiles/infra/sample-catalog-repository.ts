import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { withIndustryKey } from "@/modules/organization/domain/industry-key"
import { organizationSettingsData, ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"

type Db = typeof prisma

export interface SampleProductInput {
  code: string
  name: string
  category: string
  attributes: Record<string, unknown>
  variantAttributes: Record<string, unknown>
}

/** Mã sản phẩm mẫu do "Nạp dữ liệu mẫu" sinh ra — chỉ những sản phẩm này bị thay khi nạp lại. */
export const SAMPLE_PRODUCT_CODE_PREFIX = "DEMO-"

/**
 * Ghi dữ liệu mẫu theo ngành cho MỘT tổ chức (use-case `apply-industry-mock-data`). Mọi truy
 * vấn lọc theo `organization_id`; thay danh mục mẫu trong một giao dịch.
 */
export class SampleCatalogRepository {
  constructor(private readonly db: Db = prisma) {}

  /** Ngành trong `settings.industry` lấy từ cột `industry_key` (ADR-012 T-6c-1). */
  async findOrganization(organizationId: string) {
    const org = await this.db.organizations.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, type: true, ...ORG_SETTINGS_SELECT },
    })
    return org ? withIndustryKey(org) : null
  }

  async updateOrganizationSettings(organizationId: string, settings: Record<string, unknown>): Promise<void> {
    await this.db.organizations.update({
      where: { id: organizationId },
      data: organizationSettingsData(settings),
    })
  }

  /** Xoá sản phẩm mẫu cũ (kèm bản ghi phụ) rồi tạo danh mục mẫu mới — một giao dịch. */
  async replaceSampleProducts(organizationId: string, products: SampleProductInput[]): Promise<number> {
    return this.db.$transaction(async (tx) => {
      const existing = await tx.products.findMany({
        where: { organization_id: organizationId, code: { startsWith: SAMPLE_PRODUCT_CODE_PREFIX } },
        select: { id: true },
      })
      if (existing.length > 0) {
        const scope = { organization_id: organizationId, product_id: { in: existing.map((p) => p.id) } }
        await tx.product_bookings.deleteMany({ where: scope })
        await tx.product_inventory.deleteMany({ where: scope })
        await tx.product_images.deleteMany({ where: scope })
        await tx.product_analyses.deleteMany({ where: scope })
        await tx.product_variants.deleteMany({ where: scope })
        await tx.products.deleteMany({ where: { organization_id: organizationId, id: { in: existing.map((p) => p.id) } } })
      }

      for (const p of products) {
        const product = await tx.products.create({
          data: {
            organization_id: organizationId,
            code: p.code,
            name: p.name,
            category: p.category,
            status: "ACTIVE",
            attributes: p.attributes as Prisma.InputJsonValue,
          },
        })
        await tx.product_variants.create({
          data: {
            organization_id: organizationId,
            product_id: product.id,
            name: "Tiêu chuẩn",
            multiplier: 1.0,
            attributes: p.variantAttributes as Prisma.InputJsonValue,
          },
        })
      }
      return products.length
    })
  }
}
