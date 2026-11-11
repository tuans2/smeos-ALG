import { beforeEach, describe, expect, it, vi } from "vitest"

/** Audit API §31 (11/11/2026): route chỉ kiểm phiên, không kiểm `R1` như đặc tả 06 ghi. */
let capabilities = new Set<string>(["R1"])
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({
  requireTenantContext: async () => ({ ctx: { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities } }),
}))
const listCatalogsForTenant = vi.fn(async () => [])
vi.mock("@/modules/field-platform/use-cases/list-catalogs-for-tenant", () => ({
  listCatalogsForTenant: (...a: unknown[]) => listCatalogsForTenant(...(a as [])),
}))

import { GET } from "@/app/api/v1/field-config/catalogs/route"

const get = () => GET(new Request("http://localhost/api/v1/field-config/catalogs?keys=priority"))

describe("GET /field-config/catalogs — gác R1", () => {
  beforeEach(() => listCatalogsForTenant.mockClear())

  it("có R1 → 200", async () => {
    capabilities = new Set(["R1"])
    expect((await get()).status).toBe(200)
    expect(listCatalogsForTenant).toHaveBeenCalledWith(["priority"])
  })

  it("thiếu R1 → 403, không đọc danh mục", async () => {
    capabilities = new Set(["R4"])
    const res = await get()
    expect(res.status).toBe(403)
    expect(listCatalogsForTenant).not.toHaveBeenCalled()
  })
})
