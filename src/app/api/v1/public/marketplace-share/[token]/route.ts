/**
 * GET /api/v1/public/marketplace-share/:token — danh sách chợ đối tác qua link chia sẻ.
 * Công khai, không phiên: gác bằng token (băm SHA-256, còn hạn, chưa huỷ) + giới hạn tần
 * suất theo IP. Dữ liệu luôn đã che một phần; lọc làm ở trình duyệt.
 */
import { enforceRateLimit } from "@/core/http/rate-limit"
import { jsonResponse } from "@/core/http/response"
import { viewSharedMarketplace } from "@/modules/platform/use-cases/share-partner-marketplace"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "marketplace-share", limit: 60, windowMs: 10 * 60_000, per: "ip" },
  handler: async ({ params }) => {
    const { token } = params as { token: string }
    const result = await viewSharedMarketplace(token)
    return jsonResponse(
      { data: { stores: result.stores, total: result.total, expiresAt: result.expiresAt.toISOString() } },
      { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } }
    )
  },
})

export const dynamic = "force-dynamic"
