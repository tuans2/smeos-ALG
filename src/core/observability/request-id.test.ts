import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { handle, jsonResponse } from "@/core/http/response"
import { proxy } from "@/proxy"

import { log } from "./log"
import { currentRequestId } from "./request-context"
import { REQUEST_ID_HEADER, resolveRequestId } from "./request-id"

afterEach(() => vi.restoreAllMocks())

describe("mã yêu cầu (E1.1)", () => {
  it("giữ mã hợp lệ từ phía trước, sinh mới khi thiếu hoặc lạ", () => {
    expect(resolveRequestId("render-abc-12345")).toBe("render-abc-12345")
    for (const bad of [null, "", "ngắn", "có khoảng trắng 12345", "x".repeat(200)]) {
      expect(resolveRequestId(bad)).toMatch(/^[0-9a-f-]{36}$/)
    }
  })

  it("proxy gắn cùng một mã vào request và phản hồi", async () => {
    const res = await proxy(new NextRequest("http://localhost/api/v1/orders", { headers: { [REQUEST_ID_HEADER]: "req-from-edge-1" } }))
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe("req-from-edge-1")
    expect(res.headers.get(`x-middleware-request-${REQUEST_ID_HEADER}`)).toBe("req-from-edge-1")
  })

  it("handle() đưa mã vào ngữ cảnh — log trong handler tự mang requestId", async () => {
    const lines: string[] = []
    vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line))
    const route = handle(async () => {
      log.info("test.event", { jobId: "job-1" })
      return jsonResponse({ id: currentRequestId() })
    })

    const res = await route(new Request("http://localhost/x", { headers: { [REQUEST_ID_HEADER]: "req-handler-1" } }))

    expect(await res.json()).toEqual({ id: "req-handler-1" })
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({ event: "test.event", requestId: "req-handler-1", jobId: "job-1" })
  })

  it("ngoài request thì log không có requestId", () => {
    const lines: string[] = []
    vi.spyOn(console, "log").mockImplementation((line: string) => void lines.push(line))
    log.info("cron.tick")
    expect(JSON.parse(lines[0] ?? "{}")).not.toHaveProperty("requestId")
  })

  it("lỗi ngoài dự kiến trong handle() → 500 và log http.internal_error có path + requestId", async () => {
    const lines: string[] = []
    vi.spyOn(console, "error").mockImplementation((line: string) => void lines.push(line))
    const route = handle(async () => {
      throw new Error("boom")
    })

    const res = await route(new Request("http://localhost/api/v1/orders?x=1", { method: "POST", headers: { [REQUEST_ID_HEADER]: "req-err-12345" } }))

    expect(res.status).toBe(500)
    expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
      event: "http.internal_error",
      method: "POST",
      path: "/api/v1/orders",
      requestId: "req-err-12345",
      error: "boom",
    })
  })
})
