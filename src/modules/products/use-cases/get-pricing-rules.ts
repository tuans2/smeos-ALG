import { branchScopeFor, type TenantContext } from "@/core/tenancy"
import { parsePeakHours, parseTierDiscount } from "@/modules/products/domain/customer-tier-pricing"
import {
  mergeEffectiveFloorCeilingRatio,
  mergeEffectivePricingConfig,
} from "@/modules/products/domain/pricing-rules"
import type { IPricingRuleRepository } from "../domain/repositories/pricing-rule-repository.interface"
import { getPricingRuleRepository } from "../infra/pricing-rule-repository"

/**
 * `GET /pricing-rules` (`L5`, đặc tả 06 mục 6). Trả cấu hình giá HIỆU LỰC —
 * đã hợp nhất mặc định/tổ chức/chi nhánh — không trả nguyên bản lịch sử các
 * dòng đã ghi (`PricingRuleRepository.currentRows` chỉ là bước trung gian).
 *
 * `branchId` mặc định lấy từ phiên (`ctx.branchId`, `null` = toàn tổ chức);
 * `overrideBranchId` cho phép xem cấu hình hiệu lực CỦA MỘT CHI NHÁNH KHÁC —
 * dùng khi Điều hành ở phạm vi tổ chức muốn xem chi nhánh cụ thể đang áp
 * dụng gì, không cần chuyển phiên sang chi nhánh đó.
 */
export async function getPricingRules(
  ctx: TenantContext,
  overrideBranchId?: string | null,
  pricingRepo: IPricingRuleRepository = getPricingRuleRepository()
) {
  // Bị giới hạn theo chi nhánh → chỉ xem cấu hình hiệu lực của chi nhánh mình (ALG 9.13, ADR-012 T-5b)
  const scope = branchScopeFor(ctx, "L5")
  const branchId = scope ?? (overrideBranchId !== undefined ? overrideBranchId : ctx.branchId)
  const rows = await pricingRepo.currentRows(ctx)

  const config = mergeEffectivePricingConfig(rows, branchId)
  const floorCeilingRatio = mergeEffectiveFloorCeilingRatio(rows, branchId)

  return {
    branch_id: branchId,
    partner_tier_bonus: config.partnerTierBonus,
    surcharge_groups: config.surchargeGroups,
    optimal_price_ratio: config.optimalPriceRatio,
    floor_ceiling_ratio: floorCeilingRatio,
    // Checklist ALG 3.1 — áp ở báo giá Thẻ Chào theo phạm vi tổ chức
    customer_tier_discount: parseTierDiscount(rows.find((r) => r.key === "customer_tier_discount" && r.branch_id === null)?.value),
    peak_hour_surcharge: parsePeakHours(rows.find((r) => r.key === "peak_hour_surcharge" && r.branch_id === null)?.value),
  }
}
