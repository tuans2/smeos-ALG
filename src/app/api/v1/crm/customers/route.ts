/**
 * GET|POST /api/v1/crm/customers
 * Q1: Xem danh sách khách hàng
 * Q2: Tạo khách hàng mới
 */

import { jsonResponse } from "@/core/http/response"
import { createCustomer } from "@/modules/crm/use-cases/create-customer"
import { listCustomers } from "@/modules/crm/use-cases/list-customers"
import type { CustomerTier } from "@/modules/crm/domain/customer-master-index"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const tier = (url.searchParams.get("tier") as CustomerTier) || undefined
    const search = url.searchParams.get("search") || undefined
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 50
    const offset = url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0

    const result = await listCustomers(ctx, { tier, search }, { limit, offset })
    return jsonResponse(result)
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "Q2" },
  handler: async ({ request, ctx }) => {
    const body = await request.json()
    const customer = await createCustomer(ctx, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      tags: body.tags,
      preferredFlowers: body.preferredFlowers,
      preferredColors: body.preferredColors,
    })

    return jsonResponse({ customer }, { status: 201 })
  },
})
