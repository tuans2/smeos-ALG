import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import {
  toTenantContext,
} from "@/modules/integration/use-cases/resolve-integration-context"
import { listProducts } from "@/modules/products/use-cases/list-products"
import { defineRoute } from "@/core/http/define-route"

/**
 * `GET /integration/products` (đặc tả 06 mục 11, đặc tả 08 mục 4): "Product
 * Master của tổ chức" — LUÔN lọc `status = ACTIVE`, bỏ qua mọi giá trị
 * `status` client có thể truyền (bản nháp/ngừng kinh doanh không phải dữ
 * liệu bàn giao cho engine ngoài). `ctx.capabilities` rỗng (token không có
 * `L5`) nên `listProducts` tự ẩn khối `pricing` — không cần lọc thêm ở đây.
 */
export const GET = defineRoute({
  auth: { kind: "integration" },
  handler: async ({ request, ic }) => {
    const ctx = await toTenantContext(ic)

    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listProducts(
      ctx,
      {
        status: "ACTIVE",
        ...(url.searchParams.has("branch_id") ? { branchId: url.searchParams.get("branch_id") } : {}),
        ...(url.searchParams.has("category") ? { category: url.searchParams.get("category") ?? "" } : {}),
        ...(url.searchParams.has("occasion_code") ? { occasionCode: url.searchParams.get("occasion_code") ?? "" } : {}),
        ...(url.searchParams.has("color") ? { color: url.searchParams.get("color") ?? "" } : {}),
        ...(url.searchParams.has("collection") ? { collection: url.searchParams.get("collection") ?? "" } : {}),
        ...(url.searchParams.has("price_min") ? { priceMin: Number(url.searchParams.get("price_min")) } : {}),
        ...(url.searchParams.has("price_max") ? { priceMax: Number(url.searchParams.get("price_max")) } : {}),
      },
      { limit, cursor: url.searchParams.get("cursor") }
    )
    return jsonResponse(result)
  },
})
