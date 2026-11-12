/**
 * GET|PATCH|DELETE /api/v1/crm/customers/[id]
 * Q1: Xem khách hàng
 * Q3: Sửa thông tin khách hàng
 * Q4: Xoá khách hàng (Hard Cap điều hành)
 */

import { jsonResponse } from "@/core/http/response"
import { getCustomerMasterIndex } from "@/modules/crm/use-cases/get-customer-master-index"
import { updateCustomer } from "@/modules/crm/use-cases/update-customer"
import { deleteCustomer } from "@/modules/crm/use-cases/delete-customer"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "Q1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    const customer = await getCustomerMasterIndex(ctx, id)
    return jsonResponse({ customer })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "Q3" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
    const body = await request.json()
    const customer = await updateCustomer(ctx, id, {
      name: body.name,
      phone: body.phone,
      email: body.email,
      address: body.address,
      notes: body.notes,
      tags: body.tags,
      preferredFlowers: body.preferredFlowers,
      preferredColors: body.preferredColors,
    })

    return jsonResponse({ customer })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "Q4" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await deleteCustomer(ctx, id)
    return jsonResponse({ success: true })
  },
})
