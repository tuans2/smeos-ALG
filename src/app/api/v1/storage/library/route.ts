import { jsonResponse } from "@/core/http/response"
import { parseLibraryScope } from "@/modules/storage/domain/library"
import { listLibrary } from "@/modules/storage/use-cases/list-library"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/storage/library?type=&scope=all|hq|<branchId>&q=&from=<ISO>&cursor=
 * Kho dữ liệu v2 — mã quyền theo từng `type` (`domain/library.ts`).
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: parseLibraryScope, listLibrary" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const fromRaw = url.searchParams.get("from")
    const from = fromRaw ? new Date(fromRaw) : null
    const data = await listLibrary(ctx, {
      type: url.searchParams.get("type") ?? "",
      scope: parseLibraryScope(url.searchParams.get("scope")),
      q: url.searchParams.get("q")?.trim() || null,
      from: from && !Number.isNaN(from.getTime()) ? from : null,
      cursor: url.searchParams.get("cursor"),
    })
    return jsonResponse({ data })
  },
})
