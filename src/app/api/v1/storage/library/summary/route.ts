import { jsonResponse } from "@/core/http/response"
import { parseLibraryScope } from "@/modules/storage/domain/library"
import { getLibrarySummary } from "@/modules/storage/use-cases/list-library"
import { defineRoute } from "@/core/http/define-route"

/**
 * GET /api/v1/storage/library/summary?scope= — loại dữ liệu người xem có quyền, số mục theo phạm vi, danh
 * sách chi nhánh (chuỗi). Không trả dữ liệu nghiệp vụ; quyền từng loại kiểm ở
 * `GET /storage/library`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "mã năng lực kiểm ở use-case: parseLibraryScope, getLibrarySummary" },
  handler: async ({ request, ctx }) => {
    const scope = parseLibraryScope(new URL(request.url).searchParams.get("scope"))
    return jsonResponse({ data: await getLibrarySummary(ctx, scope) })
  },
})
