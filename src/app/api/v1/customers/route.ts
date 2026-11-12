import { validationFailed } from "@/core/http/errors"
import { hasCapability, requireCapability } from "@/core/rbac/capabilities"
import { page } from "@/core/http/contract-responses"
import { defineRoute } from "@/core/http/define-route"
import { decodeCursor, toPage } from "@/core/http/pagination"
import { listCustomersPage } from "@/modules/crm/use-cases/list-customers-page"
import { customersQuery } from "@/app/api/v1/_contracts/requests-marketing"

/**
 * GET /api/v1/customers — tất cả khách của tổ chức cho màn Chăm sóc khách, nhóm "Tất cả" (audit L-04: màn gọi route này
 * nhưng route chưa từng có). Cùng quyền với khách theo nhóm (`/customer-segments/:id/customers`): `M4` hoặc `Q1`.
 */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "quyền kiểm trong handler: M4, Q1" },
  query: customersQuery,
  handler: async ({ ctx, query }) => {
    if (!hasCapability(ctx, "M4") && !hasCapability(ctx, "Q1")) requireCapability(ctx, "M4")
    const after = query.cursor ? afterFromCursor(query.cursor) : undefined
    const rows = await listCustomersPage(ctx, { search: query.search }, { take: query.limit + 1, after })
    return page(toPage(rows, query.limit, (c) => ({ updated_at: c.updatedAt, id: c.id })))
  },
})

function afterFromCursor(raw: string): { updatedAt: string; id: string } {
  const { updated_at: updatedAt, id } = decodeCursor(raw)
  if (typeof updatedAt !== "string" || typeof id !== "string" || Number.isNaN(Date.parse(updatedAt))) {
    throw validationFailed({ cursor: "Con trỏ không hợp lệ" })
  }
  return { updatedAt, id }
}
