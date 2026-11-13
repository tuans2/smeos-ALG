import { describe, expect, it, vi } from "vitest"

import { createRenderDomainsClient } from "./render-custom-domains"

const env = { RENDER_API_KEY: "khoa-thu", RENDER_SERVICE_ID: "srv-123" }

describe("Render — gắn tên miền riêng (ALG 10.8, PO Q11)", () => {
  it("chưa cấu hình khoá → manual, không gọi mạng", async () => {
    const fetch = vi.fn()
    const client = createRenderDomainsClient({ fetch: fetch as unknown as typeof globalThis.fetch, env: {} })
    expect(await client.attach("hoa.tiem.vn")).toBe("manual")
    expect(await client.detach("hoa.tiem.vn")).toBe("manual")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("gắn: POST đúng dịch vụ kèm tên miền; 201 hoặc 409 (đã gắn) → requested; lỗi khác → failed", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 201 }))
    const client = createRenderDomainsClient({ fetch: fetch as unknown as typeof globalThis.fetch, env })
    expect(await client.attach("hoa.tiem.vn")).toBe("requested")
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("https://api.render.com/v1/services/srv-123/custom-domains")
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual({ name: "hoa.tiem.vn" })
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer khoa-thu")

    fetch.mockResolvedValueOnce(new Response("{}", { status: 409 }))
    expect(await client.attach("hoa.tiem.vn")).toBe("requested")
    fetch.mockResolvedValueOnce(new Response("{}", { status: 401 }))
    expect(await client.attach("hoa.tiem.vn")).toBe("failed")
    fetch.mockRejectedValueOnce(new Error("timeout"))
    expect(await client.attach("hoa.tiem.vn")).toBe("failed")
  })

  it("gỡ: DELETE theo tên miền; 404 (đã gỡ) vẫn tính là gỡ xong", async () => {
    const fetch = vi.fn(async () => new Response(null, { status: 404 }))
    const client = createRenderDomainsClient({ fetch: fetch as unknown as typeof globalThis.fetch, env })
    expect(await client.detach("hoa.tiem.vn")).toBe("removed")
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://api.render.com/v1/services/srv-123/custom-domains/hoa.tiem.vn")
  })
})
