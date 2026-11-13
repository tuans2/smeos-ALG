import { afterEach, describe, expect, it, vi } from "vitest"

import { reportRequestError } from "./request-error"

describe("reportRequestError", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("ghi một dòng JSON http.unhandled_error, bỏ query string, header và cookie", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const error = Object.assign(new TypeError("x is undefined"), { digest: "123" })
    reportRequestError(
      error,
      {
        path: "/subcontract/DH-1?branch=b1&t=org.exp.sig",
        method: "GET",
        headers: { cookie: "smeos_session=abc", authorization: "Bearer zzz", "rndr-id": "req-9" },
      },
      { routePath: "/subcontract/[orderCode]", routeType: "render" }
    )
    expect(spy).toHaveBeenCalledTimes(1)
    const raw = String(spy.mock.calls[0]?.[0])
    expect(JSON.parse(raw)).toMatchObject({
      level: "error",
      event: "http.unhandled_error",
      method: "GET",
      path: "/subcontract/DH-1",
      routePath: "/subcontract/[orderCode]",
      routeType: "render",
      requestId: "req-9",
      errorName: "TypeError",
      message: "x is undefined",
      digest: "123",
    })
    expect(raw).not.toContain("org.exp.sig")
    expect(raw).not.toContain("smeos_session")
    expect(raw).not.toContain("Bearer")
  })

  it("giá trị ném ra không phải Error vẫn ghi được, cắt thông điệp dài", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    reportRequestError("x".repeat(2000), { path: "/", method: "POST", headers: {} }, {})
    const line = JSON.parse(String(spy.mock.calls[0]?.[0])) as { errorName: string; message: string }
    expect(line.errorName).toBe("string")
    expect(line.message).toHaveLength(500)
  })
})
