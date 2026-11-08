import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { QUOTATION_STATUSES } from "@/modules/sales/domain/quotation"
import { handle, jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createQuotationUseCase } from "@/modules/sales/use-cases/create-quotation.use-case"
import { listQuotationsUseCase } from "@/modules/sales/use-cases/list-quotations.use-case"
import { createQuotationBody } from "@/app/api/v1/_contracts/requests-orders"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  if (!hasCapability(ctx, "R15") && !hasCapability(ctx, "Q1")) {
    requireCapability(ctx, "R15")
  }

  const url = new URL(request.url)
  const status = enumParam(url, "status", QUOTATION_STATUSES)
  const leadId = url.searchParams.get("leadId") ?? url.searchParams.get("lead_id") ?? undefined
  const customerId =
    url.searchParams.get("customerId") ?? url.searchParams.get("customer_id") ?? undefined
  const search = url.searchParams.get("search") ?? undefined
  const cursor = url.searchParams.get("cursor") ?? undefined

  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 20
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
  }

  const result = await listQuotationsUseCase(ctx, {
    status,
    leadId,
    customerId,
    search,
    limit,
    cursor,
  })

  return jsonResponse({
    data: result.items,
    total: result.total,
    counts: result.counts,
    next_cursor: result.nextCursor,
  })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R15")

  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== "object") {
    throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
  }

  const parsed = createQuotationBody.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".")
      details[field] = issue.message
    }
    throw validationFailed(details)
  }

  const data = parsed.data
  const quotation = await createQuotationUseCase(ctx, {
    leadId: data.leadId ?? data.lead_id ?? null,
    customerId: data.customerId ?? data.customer_id ?? null,
    assetUsageId: data.assetUsageId ?? data.asset_usage_id ?? null,
    validUntil: data.validUntil ?? data.valid_until ?? null,
    discountAmount: data.discountAmount ?? data.discount_amount ?? 0,
    shippingFee: data.shippingFee ?? data.shipping_fee ?? 0,
    terms: data.terms ?? null,
    notes: data.notes ?? null,
    items: data.items.map((it) => ({
      productId: it.productId ?? it.product_id ?? null,
      name: it.name,
      variantLabel: it.variantLabel ?? it.variant_label ?? null,
      qty: it.qty,
      unitPrice: it.unitPrice ?? it.unit_price ?? 0,
      note: it.note ?? null,
    })),
  })

  return jsonResponse({ data: quotation }, { status: 201 })
})

