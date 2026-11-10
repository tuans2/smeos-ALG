import { beforeEach, describe, expect, it, vi } from "vitest"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set(["R1"]) }
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: async () => ({ ctx }) }))
vi.mock("@/core/rbac/capabilities", () => ({ requireCapability: () => undefined }))
const listOrders = vi.fn(async (): Promise<{ orders: unknown[]; total: number; nextCursor: { createdAt: string; id: string } | null }> => ({ orders: [], total: 0, nextCursor: null }))
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

  it("phản hồi chuẩn v1.1; con trỏ mờ đi vòng tròn; con trỏ hỏng → 400 (audit API-10)", async () => {
    listOrders.mockResolvedValueOnce({ orders: [{ id: "o-2" }], total: 7, nextCursor: { createdAt: "2026-11-09T01:02:03.000Z", id: "o-2" } })
    const res = await get("?limit=1")
    const body = await res.json()
    expect(body).toMatchObject({ data: [{ id: "o-2" }], meta: { total: 7 } })
    expect(typeof body.next_cursor).toBe("string")
    await get(`?cursor=${body.next_cursor}`)
    expect(listOrders).toHaveBeenLastCalledWith(ctx, expect.objectContaining({ cursor: { createdAt: "2026-11-09T01:02:03.000Z", id: "o-2" } }))
    for (const bad of ["khong-phai-base64", Buffer.from(JSON.stringify({ at: "x", id: "o" })).toString("base64url"), Buffer.from(JSON.stringify({ at: "2026-01-01" })).toString("base64url")]) {
      listOrders.mockClear()
      const r = await get(`?cursor=${bad}`)
      expect(r.status).toBe(400)
      expect(listOrders).not.toHaveBeenCalled()
    }
  })
})

