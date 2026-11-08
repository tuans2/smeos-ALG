import { handle, jsonResponse } from "@/core/http/response"
import { enforceRateLimit } from "@/core/http/rate-limit"
import { notFound } from "@/core/http/errors"
import { getPublicCatalog } from "@/modules/catalog-links/use-cases/get-public-catalog"

export const GET = handle<[{ params: Promise<{ slug: string }> }]>(
  async (request, context) => {
    // PO 07/11/2026 (audit API-09): trang công khai không phiên — chặn quét slug/tải dồn theo IP
    await enforceRateLimit(request, { scope: "catalog-view", limit: 60, windowMs: 60_000 })
    const { slug } = await context.params
    const result = await getPublicCatalog(slug)

    if (result.status === "NOT_FOUND") {
      throw notFound()
    }

    return jsonResponse(result)
  }
)

export const dynamic = "force-dynamic"
