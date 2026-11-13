import { validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import {
  DEFAULT_FILTER_STATE,
  OCCASIONS,
  PRICE_RANGES,
  SORT_OPTIONS,
  filterAndSortProducts,
  type ProductFilterState,
} from "@/components/products/product-filter-types"
import type { ProductLookupResult } from "@/modules/products/domain/product-lookup"
import type { ListProductsFilters } from "@/modules/products/domain/repositories/product-repository.interface"
import { listProducts } from "./list-products"

/** Trần số sản phẩm quét cho một lượt lọc Dịp/Giá/Sắp xếp — vòng lặp có giới hạn. */
export const SCAN_MAX_ROWS = 3000
const SCAN_PAGE = 100
const OFFSET_PREFIX = "o:"

export type ScanFilters = Pick<ProductFilterState, "occasion" | "priceRange" | "customMinPrice" | "customMaxPrice" | "sortBy">

export function needsScan(f: Partial<ScanFilters>): boolean {
  return (
    (f.occasion !== undefined && f.occasion !== "all") ||
    (f.priceRange !== undefined && f.priceRange !== "all") ||
    (f.sortBy !== undefined && f.sortBy !== "default")
  )
}

const OCCASION_IDS = new Set<string>(OCCASIONS.map((o) => o.id))
const PRICE_RANGE_IDS = new Set<string>(PRICE_RANGES.map((r) => r.id))
const SORT_IDS = new Set<string>(SORT_OPTIONS.map((o) => o.id))

/** Đọc `occasion`/`price_range`/`price_min`/`price_max`/`sort` — giá trị lạ → 400, không lặng lẽ bỏ qua. */
export function parseScanParams(params: URLSearchParams): Partial<ScanFilters> {
  const out: Partial<ScanFilters> = {}
  const occasion = params.get("occasion")
  if (occasion !== null) {
    if (!OCCASION_IDS.has(occasion)) throw validationFailed({ occasion: "Dịp không hợp lệ" })
    out.occasion = occasion as ScanFilters["occasion"]
  }
  const range = params.get("price_range")
  if (range !== null) {
    if (!PRICE_RANGE_IDS.has(range)) throw validationFailed({ price_range: "Khoảng giá không hợp lệ" })
    out.priceRange = range as ScanFilters["priceRange"]
    if (range === "custom") {
      out.customMinPrice = params.get("price_min") === null ? null : Number(params.get("price_min"))
      out.customMaxPrice = params.get("price_max") === null ? null : Number(params.get("price_max"))
    }
  }
  const sort = params.get("sort")
  if (sort !== null) {
    if (!SORT_IDS.has(sort)) throw validationFailed({ sort: "Cách sắp xếp không hợp lệ" })
    out.sortBy = sort as ScanFilters["sortBy"]
  }
  return out
}

function parseOffset(cursor: string | null | undefined): number {
  if (!cursor) return 0
  const n = cursor.startsWith(OFFSET_PREFIX) ? Number(cursor.slice(OFFSET_PREFIX.length)) : NaN
  if (!Number.isInteger(n) || n < 0) throw validationFailed({ cursor: "Con trỏ không hợp lệ" })
  return n
}

/**
 * `GET /products` khi có lọc Dịp/Khoảng giá/Sắp xếp: Dịp khớp theo từ khoá trong tên/thuộc tính và giá
 * nằm trong JSON nên Postgres không lọc thẳng được. Quét theo lô qua `listProducts` (giữ nguyên lọc
 * tenant/trạng thái/danh mục/từ khoá và cắt giá theo `L5`), áp CÙNG hàm `filterAndSortProducts` mà giao
 * diện dùng, rồi phân trang theo vị trí. `total` đúng trên toàn kho tới `SCAN_MAX_ROWS`; vượt trần thì
 * `truncated: true` để giao diện nhắc thu hẹp bộ lọc.
 */
export async function scanProducts(
  ctx: TenantContext,
  filters: ListProductsFilters,
  scan: Partial<ScanFilters>,
  options: { limit: number; cursor?: string | null | undefined },
  list: typeof listProducts = listProducts
): Promise<{ data: ProductLookupResult[]; next_cursor: string | null; total: number; truncated: boolean }> {
  if (options.limit < 1 || options.limit > SCAN_PAGE) throw validationFailed({ limit: `Phải trong khoảng 1..${SCAN_PAGE}` })
  const offset = parseOffset(options.cursor)
  const rows: ProductLookupResult[] = []
  let cursor: string | null = null
  let truncated = false
  for (let i = 0; i < SCAN_MAX_ROWS / SCAN_PAGE; i++) {
    const page = await list(ctx, filters, { limit: SCAN_PAGE, cursor })
    rows.push(...page.data)
    cursor = page.next_cursor
    if (!cursor) break
    if (i === SCAN_MAX_ROWS / SCAN_PAGE - 1) truncated = true
  }

  // Từ khoá/danh mục đã lọc ở Postgres — chỉ áp phần còn lại để không lọc hai lần khác nhau.
  const matched = filterAndSortProducts(rows, { ...DEFAULT_FILTER_STATE, ...scan, search: "", category: "Tất cả" })
  const data = matched.slice(offset, offset + options.limit)
  const nextOffset = offset + options.limit
  return {
    data,
    next_cursor: nextOffset < matched.length ? `${OFFSET_PREFIX}${nextOffset}` : null,
    total: matched.length,
    truncated,
  }
}
