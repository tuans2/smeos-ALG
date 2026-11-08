import { validationFailed } from "@/core/http/errors"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { pickCommerceInput, stripCostPrice } from "@/modules/products/domain/product-commerce"
import { handle, jsonResponse } from "@/core/http/response"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { isPendingProposal } from "@/modules/products/domain/product-proposal"
import { createProduct } from "@/modules/products/use-cases/create-product"
import { listProducts } from "@/modules/products/use-cases/list-products"
import { needsScan, parseScanParams, scanProducts } from "@/modules/products/use-cases/scan-products"
import { notifyProductProposed } from "@/modules/products/use-cases/product-proposal-notifications"
import { PRODUCT_STATUS, PROPOSAL_FILTERS, createProductBody } from "@/app/api/v1/_contracts/requests-products"

/** `GET /products` (`L1`, đặc tả 06 mục 6) — M03. Lọc `branch_id`/`status`/`category`. */
export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L1")

  const url = new URL(request.url)
  const statusParam = url.searchParams.get("status")
  if (statusParam !== null && !PRODUCT_STATUS.includes(statusParam as (typeof PRODUCT_STATUS)[number])) {
    throw validationFailed({ status: `Phải là một trong: ${PRODUCT_STATUS.join(", ")}` })
  }

  const limitParam = url.searchParams.get("limit")
  const limit = limitParam === null ? undefined : Number(limitParam)
  if (limit !== undefined && !Number.isInteger(limit)) {
    throw validationFailed({ limit: "Phải là số nguyên" })
  }

  const proposalParam = url.searchParams.get("proposal")
  if (proposalParam !== null && !PROPOSAL_FILTERS.includes(proposalParam as (typeof PROPOSAL_FILTERS)[number])) {
    throw validationFailed({ proposal: `Phải là một trong: ${PROPOSAL_FILTERS.join(", ")}` })
  }

  const priceMinParam = url.searchParams.get("price_min")
  const priceMaxParam = url.searchParams.get("price_max")
  if (priceMinParam !== null && isNaN(Number(priceMinParam))) {
    throw validationFailed({ price_min: "Phải là số" })
  }
  if (priceMaxParam !== null && isNaN(Number(priceMaxParam))) {
    throw validationFailed({ price_max: "Phải là số" })
  }

  const filters = {
    ...(url.searchParams.has("branch_id") ? { branchId: url.searchParams.get("branch_id") } : {}),
    ...(statusParam !== null ? { status: statusParam as (typeof PRODUCT_STATUS)[number] } : {}),
    ...(url.searchParams.has("category") ? { category: url.searchParams.get("category") ?? "" } : {}),
    ...(url.searchParams.has("occasion_code") ? { occasionCode: url.searchParams.get("occasion_code") ?? "" } : {}),
    ...(url.searchParams.has("color") ? { color: url.searchParams.get("color") ?? "" } : {}),
    ...(url.searchParams.has("collection") ? { collection: url.searchParams.get("collection") ?? "" } : {}),
    ...(priceMinParam !== null ? { priceMin: Number(priceMinParam) } : {}),
    ...(priceMaxParam !== null ? { priceMax: Number(priceMaxParam) } : {}),
    ...(url.searchParams.has("search") ? { search: url.searchParams.get("search") ?? "" } : {}),
    ...(proposalParam ? { proposalStatus: proposalParam as (typeof PROPOSAL_FILTERS)[number] } : {}),
  }
  // Lọc Dịp/Khoảng giá/Sắp xếp chạy trên máy chủ cho toàn kho (công cụ 53 giai đoạn 5).
  const scan = parseScanParams(url.searchParams)
  if (needsScan(scan)) {
    return jsonResponse(await scanProducts(ctx, filters, scan, { limit: limit ?? 25, cursor: url.searchParams.get("cursor") }))
  }
  const result = await listProducts(ctx, filters, { limit, cursor: url.searchParams.get("cursor") })
  return jsonResponse(result)
})

/** `POST /products` (`L2`, đặc tả 06 mục 6). */
export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "L2")

  const parsed = createProductBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  if (parsed.data.cost_price_vnd !== undefined) requireCapability(ctx, "L5")

  const product = await createProduct(ctx, {
    code: parsed.data.code ?? "",
    name: parsed.data.name,
    branchId: parsed.data.branch_id ?? null,
    category: parsed.data.category ?? null,
    shape: parsed.data.shape ?? null,
    facing: parsed.data.facing ?? null,
    container: parsed.data.container ?? null,
    status: parsed.data.status,
    attributes: parsed.data.attributes ?? null,
    imageAssetId: parsed.data.image_asset_id ?? null,
    commerce: pickCommerceInput(parsed.data),
  })

  if (isPendingProposal(product.attributes as Record<string, unknown> | null)) notifyProductProposed(ctx, product)

  return jsonResponse(stripCostPrice(product, hasCapability(ctx, "L5")), { status: 201 })
})
