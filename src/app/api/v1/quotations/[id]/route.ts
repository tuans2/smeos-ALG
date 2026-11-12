import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import type { QuotationStatus } from "@/modules/sales/domain/quotation"
import { getQuotationUseCase } from "@/modules/sales/use-cases/get-quotation.use-case"
import { updateQuotationUseCase } from "@/modules/sales/use-cases/update-quotation.use-case"
import { updateQuotationBody } from "@/app/api/v1/_contracts/requests-orders"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: R15, Q1" },
  handler: async ({ ctx, params }) => {
    if (!hasCapability(ctx, "R15") && !hasCapability(ctx, "Q1")) {
      requireCapability(ctx, "R15")
    }

    const { id } = params as { id: string }
    const quotation = await getQuotationUseCase(ctx, id)

    return jsonResponse({ data: quotation })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }

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
  },
})

