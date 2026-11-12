/**
 * `GET /api/v1/field-config/catalogs?keys=priority,serviceLevel,…` (`R1`,
 * tenant, CHỈ ĐỌC — ĐP-4a.1, 26/09/2026). Dùng bởi form nhập liệu (T01…) để
 * lấy nhãn/mã đang active của danh mục — KHÔNG đòi quyền quản trị nền tảng
 * (khác `GET /api/v1/platform/catalogs`, đòi N12). Gác `R1` như cột năng lực đặc tả 06 (audit API §31,
 * 11/11/2026 — trước đây chỉ kiểm phiên).
 */
import { jsonResponse } from "@/core/http/response"
import { listCatalogsForTenant } from "@/modules/field-platform/use-cases/list-catalogs-for-tenant"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "R1" },
  handler: async ({ request, ctx }) => {
    const url = new URL(request.url)
    const keysParam = url.searchParams.get("keys")
    const keys = keysParam
      ? keysParam
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined
    return jsonResponse({ data: await listCatalogsForTenant(keys) })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
