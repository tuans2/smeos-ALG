import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { GET as proxyGet, POST as proxyPost } from "@/app/api/v1/proxy/[...path]/route"
import { env } from "@/lib/env"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

/**
 * Hồi quy P2 (audit API §33): `/proxy` từng chuyển tiếp cho người chưa đăng nhập mọi đường dẫn trong danh sách trắng
 * (chỉ `api/accounts` ghi mới đòi phiên), và lỗi mạng trả 500 kèm địa chỉ nội bộ của hệ thống đích.
 */
const BASE = "http://localhost/api/v1/proxy"
const UPSTREAM = "http://sf-noi-bo.local:8000"
const params = (path: string) => ({ params: Promise.resolve({ path: path.split("/") }) })

describe("proxy đòi phiên và không lộ địa chỉ hệ thống đích", () => {
  let t: Tenant
  const prevUrl = env.SOCIALFLOW_URL
  const fetchMock = vi.fn()

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("proxy-phien")
    ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = UPSTREAM
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => fetchMock.mockReset())
  afterAll(async () => {
    vi.unstubAllGlobals()
    ;(env as { SOCIALFLOW_URL?: string | undefined }).SOCIALFLOW_URL = prevUrl
    await disconnectDatabase()
  })

  it("chưa đăng nhập → 401, không gọi hệ thống đích (đọc và ghi)", async () => {
    expect((await proxyGet(new Request(`${BASE}/api/posts?client=SOCIALFLOW`), params("api/posts"))).status).toBe(401)
    expect((await proxyPost(new Request(`${BASE}/api/m07/posts?client=SOCIALFLOW`, { method: "POST", body: "{}" }), params("api/m07/posts"))).status).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("có phiên → chuyển tiếp với danh tính SSO của người gọi", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200, headers: { "content-type": "application/json" } }))
    const res = await proxyGet(withSession(`${BASE}/api/posts?client=SOCIALFLOW`, t.token), params("api/posts"))
    expect(res.status).toBe(200)
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${UPSTREAM}/api/posts`)
    const headers = new Headers((fetchMock.mock.calls[0]?.[1] as RequestInit).headers)
    expect(headers.get("x-smeos-sso")).toBeTruthy()
  })

  it("hệ thống đích không gọi được → 500 thông báo chung, không có địa chỉ nội bộ", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed: connect ECONNREFUSED ${UPSTREAM}/api/posts`))
    const res = await proxyGet(withSession(`${BASE}/api/posts?client=SOCIALFLOW`, t.token), params("api/posts"))
    expect(res.status).toBe(500)
    const body = JSON.stringify(await readJson(res))
    expect(body).not.toContain("sf-noi-bo")
    expect(body).not.toContain("8000")
    expect(body).toContain("Không gọi được SOCIALFLOW")
  })
})
