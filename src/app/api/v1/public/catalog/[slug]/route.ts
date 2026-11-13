import { jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { notFound } from "@/core/http/errors"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  // PO 07/11/2026 (audit API-09): trang công khai không phiên — chặn quét slug/tải dồn theo IP
  auth: { kind: "public" },
  rateLimit: { scope: "catalog-view", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ params }) => {
      const { slug } = params as { slug: string }
      const result = await getPublicCatalog(slug)

      if (result.status === "NOT_FOUND") {
        throw notFound()
      }

      return jsonResponse(result)
  },
})

export const dynamic = "force-dynamic"
