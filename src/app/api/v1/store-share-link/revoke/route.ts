import { jsonResponse } from "@/core/http/response"
import { revokeStoreShareLink } from "@/modules/profiles/use-cases/store-share-link"
import { defineRoute } from "@/core/http/define-route"

/** Ngừng link công khai đang hoạt động; link cũ hiện "đã ngừng chia sẻ". */
export const POST = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ ctx }) => {
    await revokeStoreShareLink(ctx)
    return jsonResponse({ revoked: true })
  },
})
