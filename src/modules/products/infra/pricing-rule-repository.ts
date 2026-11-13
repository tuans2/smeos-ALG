import type { InputJsonValue, pricing_rules } from "./entities"
import type { DbClient } from "./db-client"

import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"

import type {
  IPricingRuleRepository,
  CreatePricingRuleInput,
  PricingRuleRecord,
} from "../domain/repositories/pricing-rule-repository.interface"

export type { CreatePricingRuleInput, PricingRuleRecord }

/**
 * `pricing_rules` — đặc tả 07 mục 9, bảng dựng sẵn từ P3, nối luật ở P6.
 *
 * CHÈN-CHỈ (insert-only), không `upsert`: cột `effective_from` (không phải
 * `updated_at`) tồn tại đúng để giữ lịch sử — mỗi `PUT /pricing-rules` ghi
 * một dòng MỚI, dòng cũ không bao giờ bị sửa hay xoá. Cùng một luật đã áp
 * dụng cho `assets`/`audit_logs`: dữ liệu ảnh hưởng tới tiền phải tra ngược
 * được "lúc đó giá là bao nhiêu", không chỉ "giá hiện tại là bao nhiêu".
 * Không có ràng buộc duy nhất `(organization_id, key, branch_id)` ở tầng cơ
 * sở dữ liệu — lược đồ đặc tả 07 cố ý để vậy cho lịch sử tích luỹ tự do.
 */
export class PricingRuleRepository implements IPricingRuleRepository {
  constructor(private readonly db: DbClient = prisma) {}

  create(ctx: TenantContext, input: CreatePricingRuleInput): Promise<pricing_rules> {
    return this.db.pricing_rules.create({
      data: scopedData(ctx, {
        branch_id: input.branchId,
        key: input.key,
        value: input.value as InputJsonValue,
        created_by: input.createdBy,
      }),
    })
  }

  /**
   * Dòng hiệu lực hiện tại cho mỗi (khoá, phạm vi chi nhánh) — mới nhất theo
   * `effective_from`, không vượt quá hiện tại. Trả về CẢ hai phạm vi (toàn
   * tổ chức `branch_id = null` lẫn từng chi nhánh) trong một lượt đọc, để
   * `mergeEffectivePricingConfig`/`mergeEffectiveFloorCeilingRatio` tự chọn
   * ưu tiên theo chi nhánh đang hỏi (đặc tả 07 mục 9: "có thể theo chi nhánh").
   */
  async currentRows(ctx: TenantContext): Promise<pricing_rules[]> {
    const rows = await this.db.pricing_rules.findMany({
      where: scopedWhere(ctx, { effective_from: { lte: new Date() } }),
      orderBy: [{ effective_from: "desc" }],
    })

    const latestByKeyAndBranch = new Map<string, pricing_rules>()
    for (const row of rows) {
      const dedupeKey = `${row.key}::${row.branch_id ?? ""}`
      if (!latestByKeyAndBranch.has(dedupeKey)) latestByKeyAndBranch.set(dedupeKey, row)
    }
    return [...latestByKeyAndBranch.values()]
  }
}

let defaultPricingRuleRepository: IPricingRuleRepository | null = null

export function getPricingRuleRepository(): IPricingRuleRepository {
  if (!defaultPricingRuleRepository) {
    defaultPricingRuleRepository = new PricingRuleRepository()
  }
  return defaultPricingRuleRepository!
}

