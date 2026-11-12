import { jsonResponse } from "@/core/http/response"
import { deleteAsset } from "@/modules/assets/use-cases/delete-asset"
import { getAsset } from "@/modules/assets/use-cases/get-asset"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G1" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    return jsonResponse({ asset: await getAsset(ctx, id) })
  },
})

export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "G3" },
  handler: async ({ ctx, params }) => {
    const { id } = params as { id: string }
    await deleteAsset(ctx, id)
    return new Response(null, { status: 204 })
  },
})
