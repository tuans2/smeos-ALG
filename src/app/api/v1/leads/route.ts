/**
 * GET /api/v1/leads — khách tiềm năng để lại thông tin (công cụ 21). Q1: Xem thông tin khách hàng.
 * POST /api/v1/leads — Sale tự thêm khách tiềm năng (gọi điện, đến quầy). Q2: Thêm khách hàng mới.
 */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listLeads } from "@/modules/acquisition/use-cases/manage-leads"
import { createStaffLead } from "@/modules/acquisition/use-cases/create-staff-lead"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 20
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw validationFailed({ limit: "Phải là số nguyên từ 1 đến 100" })
    }
    const result = await listLeads(ctx, {
      status: url.searchParams.get("status") ?? undefined,
      limit,
      cursor: url.searchParams.get("cursor") ?? undefined,
    })
    return jsonResponse(result)
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "Q2" },
  handler: async ({ request, ctx }) => {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
    if (!body || typeof body !== "object") throw validationFailed({ body: "Thiếu dữ liệu" })
    const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string) : undefined)
    const lead = await createStaffLead(ctx, {
      name: str("name") ?? "",
      phone: str("phone") ?? "",
      message: str("message"),
      reason: str("reason") ?? "",
      nextFollowUpAt: str("nextFollowUpAt"),
    })
    return jsonResponse({ lead }, { status: 201 })
  },
})
