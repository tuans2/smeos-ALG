/**
 * GET /api/v1/platform/audit-logs (`N6`, P25a) — hợp `audit_logs` mọi tổ
 * chức và `platform_audit_logs`. Xem đặc tả 06 mục 21.
 */
import { jsonResponse } from "@/core/http/response"
import { listPlatformAudit } from "@/modules/platform/use-cases/list-platform-audit"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const limitParam = new URL(request.url).searchParams.get("limit")
    const limit = limitParam ? Number(limitParam) : undefined
    return jsonResponse({
      data: await listPlatformAudit(pctx, Number.isFinite(limit) && limit ? limit : undefined),
    })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
