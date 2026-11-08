import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import type { QuotationStatus } from "@/modules/sales/domain/quotation"
import { getQuotationUseCase } from "@/modules/sales/use-cases/get-quotation.use-case"
import { updateQuotationUseCase } from "@/modules/sales/use-cases/update-quotation.use-case"
import { updateQuotationBody } from "@/app/api/v1/_contracts/requests-orders"

export const GET = handle(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  if (!hasCapability(ctx, "R15") && !hasCapability(ctx, "Q1")) {
    requireCapability(ctx, "R15")
  }

  const { id } = (await (context as { params: Promise<{ id: string }> }).params)
  const quotation = await getQuotationUseCase(ctx, id)

  return jsonResponse({ data: quotation })
})

export const PATCH = handle(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R15")

  const { id } = (await (context as { params: Promise<{ id: string }> }).params)

  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== "object") {
    throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
  }

  const parsed = updateQuotationBody.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".")
      details[field] = issue.message
    }
    throw validationFailed(details)
  }

  const data = parsed.data
  const updated = await updateQuotationUseCase(ctx, id, {
    status: data.status as QuotationStatus | undefined,
    validUntil: data.validUntil ?? data.valid_until,
    discountAmount: data.discountAmount ?? data.discount_amount,
    shippingFee: data.shippingFee ?? data.shipping_fee,
    terms: data.terms,
    notes: data.notes,
    items: data.items
      ? data.items.map((it) => ({
          productId: it.productId ?? it.product_id ?? null,
          name: it.name,
          variantLabel: it.variantLabel ?? it.variant_label ?? null,
          qty: it.qty,
          unitPrice: it.unitPrice ?? it.unit_price ?? 0,
          note: it.note ?? null,
        }))
      : undefined,
  })

  return jsonResponse({ data: updated })
})

