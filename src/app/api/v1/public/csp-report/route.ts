import { enforceRateLimit } from "@/core/http/rate-limit"
import { log } from "@/core/observability/log"
import { defineRoute } from "@/core/http/define-route"

/**
 * POST /api/v1/public/csp-report — trình duyệt gửi báo cáo khi trang tải một
 * nguồn nằm ngoài CSP (chế độ Report-Only: KHÔNG chặn gì, khách không thấy).
 * Chỉ ghi nguồn bị vi phạm, không ghi nội dung trang.
 */
export const POST = defineRoute({
  auth: { kind: "public" },
  rateLimit: { scope: "csp-report", limit: 60, windowMs: 60_000, per: "ip" },
  handler: async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { "csp-report"?: Record<string, unknown> } | null
    const r = body?.["csp-report"]
    if (r) {
      const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 300) : undefined)
      log.warn("csp.violation", {
        feature: "csp",
        directive: str(r["effective-directive"] ?? r["violated-directive"]),
        blocked: str(r["blocked-uri"]),
        page: str(r["document-uri"])?.split("?")[0],
      })
    }
    return new Response(null, { status: 204 })
  },
})

export const dynamic = "force-dynamic"
