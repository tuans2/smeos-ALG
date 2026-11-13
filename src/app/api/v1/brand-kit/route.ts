import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getBrandKit } from "@/modules/brand-kit/use-cases/get-brand-kit"

/** GET /api/v1/brand-kit (F1) — trạng thái 3 bước của mục Thương hiệu (PO 08/11/2026). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => ok(await getBrandKit(ctx)),
})
