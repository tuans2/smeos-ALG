import { prisma } from "@/core/tenancy/infra/prisma"
import { phoneEquals } from "@/core/security/pii-lookup"

const KEYS = ["customer_tier_discount", "peak_hour_surcharge"] as const

/** Dữ liệu cho chiết khấu hạng khách và phụ phí giờ cao điểm ở báo giá Thẻ Chào (checklist ALG 3.1). */
export class TierPeakFactsRepository {
  constructor(private readonly db = prisma) {}

  /** Giá trị mới nhất đang hiệu lực của hai khoá quy tắc giá phạm vi tổ chức. */
  async latestRules(organizationId: string): Promise<{ tierDiscount: unknown; peakHours: unknown }> {
    const rows = await this.db.pricing_rules.findMany({
      where: { organization_id: organizationId, branch_id: null, key: { in: [...KEYS] }, effective_from: { lte: new Date() } },
      orderBy: { effective_from: "desc" },
      select: { key: true, value: true },
    })
    const latest = (key: string) => rows.find((r) => r.key === key)?.value
    return { tierDiscount: latest("customer_tier_discount"), peakHours: latest("peak_hour_surcharge") }
  }

  async customerTierByPhone(organizationId: string, phone: string): Promise<string | null> {
    if (!phone) return null
    const row = await this.db.customers.findFirst({ where: { organization_id: organizationId, AND: [phoneEquals(organizationId, phone)] }, select: { tier: true } }) // P-5b
    return row?.tier ?? null
  }
}
