import { validationFailed } from "@/core/http/errors"
import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { filterProductLookup, type ProductLookupResult } from "@/modules/products/domain/product-lookup"
import type { IProductRepository, ListProductsFilters } from "@/modules/products/domain/repositories/product-repository.interface"
import { getProductRepository } from "@/modules/products/infra/product-repository"
import type { IPricingRuleRepository } from "../domain/repositories/pricing-rule-repository.interface"
import { getPricingRuleRepository } from "../infra/pricing-rule-repository"

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

/**
 * `GET /products` (`L1`, đặc tả 06 mục 6) — M03, "Tra cứu chạy trên
 * Postgres" (Checklist P6). Lọc theo `branch_id`/`status`/`category`, phân
 * trang kiểu con trỏ (giống `listJobs`, P3), mỗi dòng đi qua
 * `filterProductLookup` để cắt khối `pricing` theo `L5` — cùng một quy tắc
 * cắt dùng cho cả danh sách lẫn một bản ghi (`getProduct`), không có hai
 * đường redaction lệch nhau.
 */
export async function listProducts(
  ctx: TenantContext,
  filters: ListProductsFilters,
  options: { limit?: number | undefined; cursor?: string | null | undefined },
  productRepo: IProductRepository = getProductRepository(),
  pricingRepo: IPricingRuleRepository = getPricingRuleRepository()
): Promise<{ data: ProductLookupResult[]; next_cursor: string | null }> {
  const limit = options.limit ?? DEFAULT_LIMIT
  if (limit < 1 || limit > MAX_LIMIT) {
    throw validationFailed({ limit: `Phải trong khoảng 1..${MAX_LIMIT}` })
  }

  const rows = await productRepo.listWithPreview(ctx, filters, {
    limit: limit + 1,
    cursor: options.cursor ?? null,
  })
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null

  const canReadPricing = hasCapability(ctx, "L5")
  const pricingRuleRows = canReadPricing ? await pricingRepo.currentRows(ctx) : []

  const data = page.map((product) =>
    filterProductLookup(
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
        masterImageUrl: product.masterImageUrl,
        price_vnd: product.price_vnd,
        driveLink: product.driveLink,
        attributes: (product.attributes as Record<string, unknown>) ?? null,
        commerce: product,
      },
      pricingRuleRows,
      { canReadPricing, branchId: ctx.branchId }
    )
  )

  return { data, next_cursor: nextCursor }
}
