import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listAuditLogs } from "@/modules/audit/use-cases/list-audit-logs"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "G9" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const limitParam = url.searchParams.get("limit")
    const limit = limitParam === null ? undefined : Number(limitParam)
    if (limit !== undefined && !Number.isInteger(limit)) {
      throw validationFailed({ limit: "Phải là số nguyên" })
    }

    const result = await listAuditLogs(ctx, { limit, cursor: url.searchParams.get("cursor"), filter: parseFilter(url) })
    return jsonResponse(result)
  },
})

const DAY = /^\d{4}-\d{2}-\d{2}$/
const TEXT_MAX = 100

/**
 * Bộ lọc phía máy chủ (checklist ALG 1.17): `action` (khớp đầu mã), `entity_type`, `entity_id`,
 * `user_id`, `from`/`to` (YYYY-MM-DD, giờ VN, tính cả hai đầu). Luôn trong tổ chức của phiên.
 */
function parseFilter(url: URL) {
  const text = (key: string) => url.searchParams.get(key)?.trim().slice(0, TEXT_MAX) || undefined
  const day = (key: string, edge: "start" | "end") => {
    const v = url.searchParams.get(key)?.trim()
    if (!v) return undefined
    const at = DAY.test(v) ? new Date(`${v}T${edge === "start" ? "00:00:00" : "23:59:59.999"}+07:00`) : new Date(NaN)
    if (Number.isNaN(at.getTime())) throw validationFailed({ [key]: "Ngày phải có dạng YYYY-MM-DD" })
    return at
  }
  return {
    actionPrefix: text("action"),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    userId: text("user_id"),
    from: day("from", "start"),
    to: day("to", "end"),
  }
}
