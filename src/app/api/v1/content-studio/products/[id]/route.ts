import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getContentProduct } from "@/modules/content-studio/use-cases/content-product"

/** GET /api/v1/content-studio/products/[id] (L1) — dữ liệu đã duyệt của sản phẩm đang làm (Bước 1–3). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "L1" },
  handler: async ({ ctx, params }) => ok(await getContentProduct(ctx, params.id ?? "")),
})
