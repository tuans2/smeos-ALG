import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { getStandardOrderVat, setStandardOrderVat } from "@/modules/orders/use-cases/standard-order-vat"
import { orderVatBody } from "@/app/api/v1/_contracts/requests-orders"

/** GET /api/v1/orders/[id]/vat (R1) — VAT và thông tin xuất hoá đơn của đơn ngoài Thẻ chào (PO 07/11/2026, Q10). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => jsonResponse({ data: await getStandardOrderVat(ctx, params.id ?? "") }),
})

/** PUT /api/v1/orders/[id]/vat (R15 — cùng quyền báo giá, vì đổi tổng tiền) — bật/tắt VAT 8%/10%, lưu thông tin hoá đơn. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  body: orderVatBody,
  handler: async ({ ctx, params, body: b }) =>
    jsonResponse({
      data: await setStandardOrderVat(ctx, params.id ?? "", {
        enabled: b.enabled,
        rate: b.rate,
        companyName: b.company_name,
        taxCode: b.tax_code,
        companyAddress: b.company_address,
        email: b.email,
      }),
    }),
})
