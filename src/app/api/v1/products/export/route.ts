import { validationFailed } from "@/core/http/errors"
import { handle } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { exportProductsCsv } from "@/modules/products/use-cases/export-products"
import { recordDataExport } from "@/modules/audit/use-cases/record-data-export"
import { PRODUCT_STATUS } from "@/app/api/v1/_contracts/requests-products"

/**
 * `GET /products/export` — CSV theo bộ lọc `status`/`category`/`search` của danh sách.
 * Quyền `R13` như mọi route xuất Excel khác (PO 14/10/2026: chỉ Điều hành, hoặc người được cấp).
 */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R13")
  const url = new URL(request.url)
  const status = url.searchParams.get("status")
  if (status !== null && !PRODUCT_STATUS.includes(status as (typeof PRODUCT_STATUS)[number])) {
    throw validationFailed({ status: `Phải là một trong: ${PRODUCT_STATUS.join(", ")}` })
  }
  const category = url.searchParams.get("category") || undefined
  const search = url.searchParams.get("search") || undefined
  const { csv, truncated } = await exportProductsCsv(ctx, {
    ...(status !== null ? { status: status as (typeof PRODUCT_STATUS)[number] } : {}),
    ...(category ? { category } : {}),
    ...(search ? { search } : {}),
  })
  await recordDataExport(ctx, "products", { status, category, search })
  const date = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="san-pham-${date}.csv"`,
      "Cache-Control": "no-store",
      "X-Export-Truncated": truncated ? "1" : "0",
    },
  })
})
