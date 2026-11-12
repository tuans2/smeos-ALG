/**
 * `GET /api/v1/field-config/catalogs?keys=priority,serviceLevel,…` (`R1`,
 * tenant, CHỈ ĐỌC — ĐP-4a.1, 26/09/2026). Dùng bởi form nhập liệu (T01…) để
 * lấy nhãn/mã đang active của danh mục — KHÔNG đòi quyền quản trị nền tảng
 * (khác `GET /api/v1/platform/catalogs`, đòi N12). Gác `R1` như cột năng lực đặc tả 06 (audit API §31,
 * 11/11/2026 — trước đây chỉ kiểm phiên).
 */
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { listCatalogsForTenant } from "@/modules/field-platform/use-cases/list-catalogs-for-tenant"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "R1")
  const url = new URL(request.url)
  const keysParam = url.searchParams.get("keys")
  const keys = keysParam
    ? keysParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined
  return jsonResponse({ data: await listCatalogsForTenant(keys) })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
