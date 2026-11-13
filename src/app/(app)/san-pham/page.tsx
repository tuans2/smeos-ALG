// Kho sản phẩm: máy chủ tải sẵn trang đầu danh sách (chưa lọc) để HTML đầu tiên đã có thẻ sản phẩm
// và ảnh — trước đây danh sách chỉ được gọi sau khi JS chạy xong, LCP di động ~5,3 s
// (docs/audit/ui-architecture-audit/12_PERFORMANCE_REPORT.md §2). Bộ lọc, tìm kiếm, tải thêm
// vẫn đi qua `GET /api/v1/products` ở client.

import { headers } from "next/headers"
import { requestCookieHeader } from "@/lib/request-cookie-header"

import { log } from "@/core/observability/log"
import { withRequestDb } from "@/core/tenancy/db-context"
import { hasCapability } from "@/core/rbac/capabilities"
import type { ProductItem } from "@/components/products/product-card"
import { INITIAL_PRODUCT_LIST_URL, type ProductListPage } from "@/components/products/product-list-page"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listProducts } from "@/modules/products/use-cases/list-products"
import { SanPhamClient } from "./san-pham-client"

const INITIAL_LIMIT = Number(new URL(INITIAL_PRODUCT_LIST_URL, "http://localhost").searchParams.get("limit"))

/**
 * Trang đầu như `GET /api/v1/products?limit=100` trả về, cùng kiểm phiên, khoá công cụ và năng lực `L1`.
 * Lỗi khi tải → `null` (ghi log): client tự gọi API như trước.
 * `cookies()`/`headers()` gọi NGOÀI try: chúng đánh dấu trang là động bằng cách ném lỗi lúc build —
 * bắt lỗi đó làm trang bị dựng tĩnh với `initialPage: null`.
 */
async function loadInitialPage(): Promise<ProductListPage<ProductItem> | null> {
  const cookieHeader = await requestCookieHeader()
  const host = (await headers()).get("host") ?? "localhost"
  try {
    const request = new Request(`http://${host}${INITIAL_PRODUCT_LIST_URL}`, { headers: { cookie: cookieHeader } })
    // Ngoài `handle()`: mở ngữ cảnh CSDL, `requireTenantContext` gắn tổ chức của phiên (RLS)
    const result = await withRequestDb("/san-pham", async () => {
      const { ctx } = await requireTenantContext(request)
      if (!hasCapability(ctx, "L1")) return null
      return listProducts(ctx, {}, { limit: INITIAL_LIMIT, cursor: null })
    })
    if (!result) return null
    // Cùng dạng JSON với API (ngày → chuỗi ISO) để client không phân biệt nguồn.
    return JSON.parse(JSON.stringify(result)) as ProductListPage<ProductItem>
  } catch (error) {
    log.warn("products.initial_page_failed", { error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

export default async function SanPhamPage() {
  return <SanPhamClient initialPage={await loadInitialPage()} />
}
