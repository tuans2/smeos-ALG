import { z } from "zod"

import { defineRoute } from "@/core/http/define-route"
import { jsonResponse } from "@/core/http/response"
import { getStandardOrderVat, setStandardOrderVat } from "@/modules/orders/use-cases/standard-order-vat"

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()

const body = z.object({
  enabled: z.boolean(),
  rate: z.union([z.literal(8), z.literal(10)]).default(10),
  company_name: optionalText(200),
  tax_code: z.string().trim().regex(/^(\d{10}|\d{10}-\d{3}|\d{12})?$/, "Mã số thuế gồm 10 hoặc 13 số (dạng 0123456789-001)").nullable().optional(),
  company_address: optionalText(300),
  email: z.union([z.literal(""), z.string().trim().email("Email nhận hoá đơn không hợp lệ").max(200)]).nullable().optional(),
})

/** GET /api/v1/orders/[id]/vat (R1) — VAT và thông tin xuất hoá đơn của đơn ngoài Thẻ chào (PO 07/11/2026, Q10). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ ctx, params }) => jsonResponse({ data: await getStandardOrderVat(ctx, params.id ?? "") }),
})

/** PUT /api/v1/orders/[id]/vat (R15 — cùng quyền báo giá, vì đổi tổng tiền) — bật/tắt VAT 8%/10%, lưu thông tin hoá đơn. */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "R15" },
  body,
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
