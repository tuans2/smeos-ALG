import { ok } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { getScanResults } from "@/modules/content-studio/use-cases/scan-results"

/** GET /api/v1/content-studio/scans/[jobId] (H1) — các Thẻ sản phẩm do một lượt quét ảnh tạo ra. */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: "H1" },
  handler: async ({ ctx, params }) => ok(await getScanResults(ctx, params.jobId ?? "")),
})
