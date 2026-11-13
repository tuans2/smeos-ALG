import { notFound } from "@/core/http/errors"
import { inBranchScope } from "@/core/tenancy"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { filterProductLookup, type ProductLookupResult } from "@/modules/products/domain/product-lookup"
import type { IProductRepository } from "@/modules/products/domain/repositories/product-repository.interface"
import { getProductRepository } from "../infra/product-repository"
import type { IPricingRuleRepository } from "../domain/repositories/pricing-rule-repository.interface"
import { getPricingRuleRepository } from "../infra/pricing-rule-repository"

/**
 * `GET /products/:id` (`L1`, đặc tả 06 mục 6). M03 — áp `filterProductLookup`
 * để khối `pricing` (cấu hình giá của tổ chức) chỉ đi ra khi có `L5`
 * (`pricing.read`), đúng ranh giới bảng ở đặc tả 06 ("GET /pricing-rules gác
 * bằng L5").
 */
export async function getProduct(
  ctx: TenantContext,
  id: string,
  productRepo: IProductRepository = getProductRepository(),
  pricingRepo: IPricingRuleRepository = getPricingRuleRepository()
): Promise<ProductLookupResult> {
  const product = await productRepo.findById(ctx, id)
  // Sản phẩm của chi nhánh khác → như không tồn tại; sản phẩm dùng chung (không gắn chi nhánh) ai cũng xem được (ALG 9.13)
  if (!product || (product.branch_id && !inBranchScope(ctx, product.branch_id))) throw notFound()

  const canReadPricing = hasCapability(ctx, "L5")
  const pricingRuleRows = canReadPricing ? await pricingRepo.currentRows(ctx) : []

  return filterProductLookup(
    {
      id: product.id,
      code: product.code,
      name: product.name,
      category: product.category ?? null,
      shape: product.shape ?? null,
      facing: product.facing ?? null,
      container: product.container ?? null,
      status: product.status,
      branch_id: product.branch_id ?? null,
      masterImageUrl: (product.attributes as Record<string, unknown> | null)?.imageUrl as string | undefined,
      price_vnd: null,
      attributes: (product.attributes as Record<string, unknown>) ?? null,
      availability_config: product.availability_config,
      commerce: product,
    },
    pricingRuleRows,
    { canReadPricing, branchId: ctx.branchId }
  )
}
