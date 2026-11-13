import { describe, expect, it } from "vitest"
import { NextRequest } from "next/server"
import { z } from "zod"

import { handle, jsonResponse, MAX_JSON_BODY_BYTES } from "@/core/http/response"

/**
 * Audit API-01 (06/11/2026): dữ liệu gửi sai từng thành 500 "Lỗi hệ thống" — `errorResponse` chỉ
 * nhận `AppError`, nên `ZodError` của `schema.parse` và `SyntaxError` của `request.json()` lọt qua.
 */
const schema = z.object({ name: z.string() })

function post(body: string): Request {
  return new Request("http://localhost/api/v1/thu", { method: "POST", headers: { "content-type": "application/json" }, body })
}

describe("handle() — lỗi dữ liệu đầu vào", () => {
  const strict = handle(async (request) => {
    schema.parse(await request.json())
    return new Response("ok")
  })

  it("ZodError từ schema.parse → 400 VALIDATION_FAILED kèm issues", async () => {
    const res = await strict(post(JSON.stringify({ name: 1 })))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe("VALIDATION_FAILED")
    expect(body.error.details.issues[0].path).toEqual(["name"])
  })

  it("thân JSON hỏng hoặc rỗng → 400, không phải 500", async () => {
    for (const raw of ["{hong", ""]) {
      const res = await strict(post(raw))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toMatchObject({ code: "VALIDATION_FAILED", details: { body: expect.any(String) } })
    }
  })

  it("NextRequest (request thật của route handler) cũng được bọc", async () => {
    const res = await strict(new NextRequest("http://localhost/api/v1/thu", { method: "POST", body: "{hong" }))
    expect(res.status).toBe(400)
  })

  it("route đang `.catch(() => null)` vẫn nhận null như cũ", async () => {
    const lenient = handle(async (request) => Response.json({ body: await request.json().catch(() => null) }))
    const res = await lenient(post("{hong"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ body: null })
  })

  it("JSON.parse ở chỗ khác (không phải thân yêu cầu) vẫn là lỗi máy chủ 500", async () => {
    const broken = handle(async () => {
      JSON.parse("{du-lieu-luu-hong")
      return new Response("ok")
    })
    const res = await broken(post("{}"))
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe("INTERNAL")
  })

  it("thân hợp lệ đọc bình thường", async () => {
    const echo = handle(async (request) => Response.json(schema.parse(await request.json())))
    const res = await echo(post(JSON.stringify({ name: "Lan" })))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: "Lan" })
  })

  it("thân vượt 2 MB → 413 PAYLOAD_TOO_LARGE, kể cả khi không khai content-length", async () => {
    const big = JSON.stringify({ name: "x".repeat(MAX_JSON_BODY_BYTES) })
    const declared = await strict(post(big))
    expect(declared.status).toBe(413)
    expect((await declared.json()).error).toMatchObject({ code: "PAYLOAD_TOO_LARGE", details: { max_bytes: MAX_JSON_BODY_BYTES } })

    const chunk = new TextEncoder().encode(big)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(chunk)
        controller.close()
      },
    })
    const streamed = new Request("http://localhost/api/v1/thu", { method: "POST", body: stream, duplex: "half" } as RequestInit)
    expect(streamed.headers.get("content-length")).toBeNull()
    expect((await strict(streamed)).status).toBe(413)
  })

  it("content-length khai vượt trần → 413 theo header, không chờ đọc thân", async () => {
    // Thân thật chỉ vài byte: nếu phải đọc hết mới chặn thì đã qua (200) — 413 nghĩa là chặn theo header
    const request = new Request("http://localhost/api/v1/thu", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": String(MAX_JSON_BODY_BYTES + 1) },
      body: JSON.stringify({ name: "Lan" }),
    })
    expect((await strict(request)).status).toBe(413)
  })

  it("thân dưới trần vẫn đọc bình thường", async () => {
    const echo = handle(async (request) => Response.json(schema.parse(await request.json())))
    const res = await echo(post(JSON.stringify({ name: "x".repeat(MAX_JSON_BODY_BYTES - 100) })))
    expect(res.status).toBe(200)
  })
})

describe("jsonResponse — cache-control", () => {
  it("mặc định no-store; route tự đặt thì giữ nguyên (audit API-17)", () => {
    expect(jsonResponse({ data: 1 }).headers.get("cache-control")).toBe("no-store")
    expect(jsonResponse({ data: 1 }, { headers: { "cache-control": "public, max-age=60" } }).headers.get("cache-control")).toBe("public, max-age=60")
  })
})

