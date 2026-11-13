import { describe, expect, it } from "vitest"
import { jsonResponse } from "@/core/http/response"

describe("jsonResponse", () => {
  it("trả 204 không body thay vì ném lỗi (xoá thành viên từng báo 'Lỗi hệ thống')", async () => {
    const res = jsonResponse(null, { status: 204 })
    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
    expect(res.headers.get("content-type")).toBeNull()
  })

  it("vẫn trả JSON cho status thường", async () => {
    const res = jsonResponse({ ok: true }, { status: 201 })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ ok: true })
  })
})
