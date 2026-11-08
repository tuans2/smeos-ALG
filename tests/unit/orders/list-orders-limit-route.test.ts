import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["R1"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx }) }))
vi.mock("@/core/rbac/capabilities", () => ({ requireCapability: () => undefined }))
const listOrders = vi.fn(async () => ({ orders: [], total: 0 }))
vi.mock("@/modules/orders/use-cases/list-orders", () => ({ listOrders: (...args: unknown[]) => listOrders(...(args as [])) }))

import { GET } from "@/app/api/v1/orders/route"

const get = (query: string) => GET(new Request(`http://localhost/api/v1/orders${query}`))

/** Audit API-03 (06/11/2026): `?limit=` từng không chặn — số lớn tải hết đơn kèm quan hệ, chữ → NaN → 500. */
describe("GET /api/v1/orders — limit", () => {
  beforeEach(() => listOrders.mockClear())

  it("mặc định 50 khi không truyền", async () => {
    expect((await get("")).status).toBe(200)
    expect(listOrders).toHaveBeenCalledWith(ctx, expect.objectContaining({ limit: 50 }))
  })

  it("nhận 1–100", async () => {
    expect((await get("?limit=100")).status).toBe(200)
    expect(listOrders).toHaveBeenCalledWith(ctx, expect.objectContaining({ limit: 100 }))
  })

  it.each(["0", "101", "100000", "abc", "2.5", "-1"])("limit=%s → 400, không gọi truy vấn", async (limit) => {
    const res = await get(`?limit=${limit}`)
    expect(res.status).toBe(400)
    expect((await res.json()).error.details).toHaveProperty("limit")
    expect(listOrders).not.toHaveBeenCalled()
  })
})
