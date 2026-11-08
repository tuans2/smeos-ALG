import { beforeEach, describe, expect, it, vi } from "vitest"

import { sessionSuperseded } from "@/core/http/errors"

const ctx = { organizationId: "org-a", workspaceId: "ws", userId: "u", branchId: null, capabilities: new Set<string>() }
const requireTenantContext = vi.fn(async (): Promise<{ ctx: typeof ctx }> => ({ ctx }))
vi.mock("@/modules/organization/use-cases/resolve-session", () => ({ requireTenantContext: () => requireTenantContext() }))
const getOrganizationIdentity = vi.fn(async (): Promise<unknown> => ({ id: "org-a", name: "Tiệm A" }))
vi.mock("@/modules/organization/infra/identity-query", () => ({ getOrganizationIdentity: () => getOrganizationIdentity() }))

import { GET } from "@/app/api/v1/noi-bo/identity/route"

const get = () => GET(new Request("http://localhost/api/v1/noi-bo/identity"))

/** Audit API-04 (06/11/2026): route từng nuốt mọi lỗi kể cả 401 và trả 500 `IDENTITY_ERROR`. */
describe("GET /api/v1/noi-bo/identity", () => {
  beforeEach(() => {
    requireTenantContext.mockReset().mockImplementation(async () => ({ ctx }))
    getOrganizationIdentity.mockReset().mockImplementation(async () => ({ id: "org-a", name: "Tiệm A" }))
  })

  it("giữ hình dạng { success, data } mà trang Kết nối đang đọc", async () => {
    const res = await get()
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, data: { id: "org-a", name: "Tiệm A" } })
  })

  it("phiên bị thay → 401 SESSION_SUPERSEDED, không phải 500", async () => {
    requireTenantContext.mockImplementation(async () => {
      throw sessionSuperseded()
    })
    const res = await get()
    expect(res.status).toBe(401)
    expect((await res.json()).error.details.reason).toBe("SESSION_SUPERSEDED")
  })

  it("không có tổ chức → 404 theo envelope chung", async () => {
    getOrganizationIdentity.mockImplementation(async () => null)
    const res = await get()
    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe("NOT_FOUND")
  })

  it("lỗi máy chủ → 500 INTERNAL, không lộ chi tiết", async () => {
    getOrganizationIdentity.mockImplementation(async () => {
      throw new Error("db down: secret-host:5432")
    })
    const res = await get()
    expect(res.status).toBe(500)
    expect(await res.text()).not.toContain("secret-host")
  })
})
