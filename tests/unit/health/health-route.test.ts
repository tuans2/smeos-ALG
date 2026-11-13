import { beforeEach, describe, expect, it, vi } from "vitest"

const ping = vi.fn<() => Promise<boolean>>()
vi.mock("@/core/tenancy/infra/database-ping", () => ({ pingDatabase: () => ping() }))

import { GET } from "@/app/api/health/route"

/** `/api/health` công khai — chỉ được nói "sống hay không" (rà soát 21/10/2026, H2). */
describe("GET /api/health", () => {
  beforeEach(() => {
    ping.mockReset()
  })

  it("CSDL trả lời: 200, chỉ có status và timestamp", async () => {
    ping.mockResolvedValue(true)
    const res = await GET()
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp"])
    expect(body.status).toBe("ok")
  })

  it("CSDL lỗi: 503, vẫn không lộ host, lỗi hay số liệu", async () => {
    ping.mockResolvedValue(false)
    const res = await GET()
    expect(res.status).toBe(503)
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(["status", "timestamp"])
    expect(body.status).toBe("degraded")
  })
})
