import { readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it, vi } from "vitest"

import { partnerToolsUrl, savePartnerUnlockedTools } from "../partner-tools-api"

/** Audit 06/11 L-05: nút Lưu "công cụ mở cho đối tác" gọi route không tồn tại nên luôn báo lỗi. */
describe("lưu công cụ mở cho đối tác", () => {
  it("gọi PATCH đúng route có thật, thân { unlockedTools }", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 }))
    expect(await savePartnerUnlockedTools("ps-1", ["don-hang", "san-pham"], fetchImpl)).toEqual({ ok: true })
    expect(fetchImpl).toHaveBeenCalledWith("/api/v1/coordinator/partners/ps-1/tools", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unlockedTools: ["don-hang", "san-pham"] }),
    })
    const route = readFileSync(path.join(process.cwd(), "src/app/api/v1/coordinator/partners/[id]/tools/route.ts"), "utf8")
    expect(route).toMatch(/export const PATCH\b/)
    expect(partnerToolsUrl("a/b")).toBe("/api/v1/coordinator/partners/a%2Fb/tools")
  })

  it("lỗi từ API hiện đúng thông điệp của máy chủ", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Không tìm thấy" } }), { status: 404 }),
    )
    expect(await savePartnerUnlockedTools("ps-x", [], fetchImpl)).toEqual({ ok: false, message: "Không tìm thấy" })
  })
})
