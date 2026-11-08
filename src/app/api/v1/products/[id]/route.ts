
import { activationWarningsFor } from "@/modules/products/use-cases/get-product-master-index"
import { validationFailed } from "@/core/http/errors"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { pickCommerceInput, stripCostPrice } from "@/modules/products/domain/product-commerce"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getProduct } from "@/modules/products/use-cases/get-product"
import { updateProduct } from "@/modules/products/use-cases/update-product"
import { patchProductBody } from "@/app/api/v1/_contracts/requests-products"

/** `GET /products/:id` (`L1`, đặc tả 06 mục 6) — M03, redaction theo `L5`. */
export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L1")

  const { id } = await context.params
  return jsonResponse(await getProduct(ctx, id))
})

/**
 * `PATCH /products/:id` (`L3`, đặc tả 06 mục 6). Chuyển sang `ARCHIVED` đòi
 * thêm `L4` (`product.archive`, trần cứng `dieu_hanh` — `capability-catalog.ts`)
 * — `L3` một mình không đủ để "ngừng kinh doanh một sản phẩm", đúng bảng ở
 * đặc tả 02 mục "Sản phẩm và giá — nhóm L". Không có route `/archive` riêng
 * trong đặc tả 06 nên chặn thêm ngay trong `PATCH` là chỗ duy nhất hợp lý.
 */
export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L3")

  const { id } = await context.params
  const parsed = patchProductBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  if (parsed.data.status === "ARCHIVED") requireCapability(ctx, "L4")
  // Giá vốn là dữ liệu giá: ghi cần `L5` như đọc (PO 30/10/2026).
  if (parsed.data.cost_price_vnd !== undefined) requireCapability(ctx, "L5")

  const updated = await updateProduct(ctx, id, {
    code: parsed.data.code,
    name: parsed.data.name,
    branchId: parsed.data.branch_id,
    category: parsed.data.category,
    shape: parsed.data.shape,
    facing: parsed.data.facing,
    container: parsed.data.container,
    status: parsed.data.status,
    attributes: parsed.data.attributes,
    imageAssetId: parsed.data.image_asset_id,
    availabilityConfig: parsed.data.availability_config,
    commerce: pickCommerceInput(parsed.data),
  })

  // Mở bán khi chưa đủ điều kiện: vẫn lưu, trả kèm danh sách còn thiếu (checklist ALG 7.3, chỉ cảnh báo)
  const warnings = parsed.data.status === "ACTIVE" ? (await activationWarningsFor(ctx, [id]))[0]?.missing ?? [] : []
  return jsonResponse({ ...stripCostPrice(updated, hasCapability(ctx, "L5")), readiness_warnings: warnings })
})
