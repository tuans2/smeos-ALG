import { hasCapability } from "@/core/rbac/capabilities"
import type { TenantContext } from "@/core/tenancy"
import { buildProductCsv } from "@/modules/products/domain/product-csv-export"
import type { ListProductsFilters } from "@/modules/products/domain/repositories/product-repository.interface"
import { listProducts } from "./list-products"

/** Trần số dòng một lần xuất — kho lớn hơn cần lọc bớt (vòng lặp có giới hạn). */
export const EXPORT_MAX_ROWS = 5000
const PAGE = 100

/**
 * `GET /products/export` (`R13`): xuất CSV theo cùng bộ lọc của danh sách. Đi qua `listProducts`
 * nên giá đã được cắt theo `L5` ở đúng một chỗ; không có `L5` thì bỏ hẳn cột giá.
 */
export async function exportProductsCsv(
  ctx: TenantContext,
  filters: ListProductsFilters,
  list: typeof listProducts = listProducts
): Promise<{ csv: string; truncated: boolean }> {
  const rows: Array<{ code: string; name: string; category: string | null; status: string; price_vnd: number | null }> = []
  let cursor: string | null = null
  let truncated = false
  for (let i = 0; i < EXPORT_MAX_ROWS / PAGE; i++) {
    const page = await list(ctx, filters, { limit: PAGE, cursor })
    for (const p of page.data) {
      rows.push({
        code: p.code,
        name: p.name,
        category: p.category ?? null,
        status: p.status,
        price_vnd: typeof p.price_vnd === "number" ? p.price_vnd : null,
      })
    }
    cursor = page.next_cursor
    if (!cursor) break
    if (i === EXPORT_MAX_ROWS / PAGE - 1) truncated = true
  }
  return { csv: buildProductCsv(rows, { includePrice: hasCapability(ctx, "L5") }), truncated }
}
