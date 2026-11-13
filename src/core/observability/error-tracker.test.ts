import { afterEach, describe, expect, it, vi } from "vitest"

import { handle } from "@/core/http/response"

import { scrubEvent } from "./adapters/sentry-error-tracker"
import { captureError, errorTags, setErrorTracker } from "./error-tracker"
import { runWithRequestId } from "./request-context"

afterEach(() => {
  setErrorTracker(null)
  vi.restoreAllMocks()
})

describe("theo dõi lỗi (E1.5)", () => {
  it("không có tracker → không làm gì", () => {
    expect(() => captureError(new Error("x"))).not.toThrow()
  })

  it("tag chỉ giữ mã định danh ngắn, bỏ khoá nhạy cảm, tự thêm requestId", () => {
    const tags = runWithRequestId("req-tag-12345", () =>
      errorTags({ path: "/api/v1/orders", recipientPhone: "0900000000", payload: { a: 1 }, attempt: 2 })
    )
    expect(tags).toEqual({ path: "/api/v1/orders", attempt: "2", requestId: "req-tag-12345" })
  })

  it("tracker lỗi không làm hỏng luồng gọi", () => {
    setErrorTracker({ capture: () => { throw new Error("sentry down") } })
    expect(() => captureError(new Error("x"))).not.toThrow()
  })

  it("lỗi 500 trong handle() được gửi kèm path và requestId", async () => {
    const capture = vi.fn()
    setErrorTracker({ capture })
    vi.spyOn(console, "error").mockImplementation(() => {})
    const route = handle(async () => {
      throw new Error("boom")
    })
    await route(new Request("http://localhost/api/v1/orders", { method: "POST", headers: { "x-request-id": "req-500-12345" } }))
    expect(capture).toHaveBeenCalledWith(expect.any(Error), { method: "POST", path: "/api/v1/orders", requestId: "req-500-12345" })
  })

  it("scrubEvent bỏ body, cookie, header, người dùng, breadcrumb trước khi gửi", () => {
    const event = scrubEvent({
      message: "boom",
      request: { data: { phone: "0900000000" }, cookies: { s: "x" }, headers: { authorization: "Bearer t" } },
      user: { email: "a@example.test" },
      breadcrumbs: [{ message: "log có tên khách" }],
      extra: { body: "..." },
    })
    expect(event).toEqual({ message: "boom" })
  })
})
