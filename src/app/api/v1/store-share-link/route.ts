import { jsonResponse } from "@/core/http/response"
import { createStoreShareLink, getStoreShareLink } from "@/modules/profiles/use-cases/store-share-link"
import { defineRoute } from "@/core/http/define-route"

/** Công cụ 11 — link hồ sơ cửa hàng công khai của tổ chức hiện tại. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await getStoreShareLink(ctx) })
  },
})

export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ ctx }) => {
    return jsonResponse({ data: await createStoreShareLink(ctx) }, { status: 201 })
  },
})
