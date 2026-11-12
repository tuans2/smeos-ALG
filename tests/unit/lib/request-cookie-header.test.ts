import { execFileSync } from "node:child_process"
import path from "node:path"

import { describe, expect, it, vi } from "vitest"

/**
 * Layout (app) trả 500 "Cannot convert argument to a ByteString" khi trình duyệt có cookie chứa chữ ngoài
 * Latin-1 (vd. DEV_ROLE_COOKIE với tên tiệm tiếng Việt): header bị ghép lại từ giá trị ĐÃ giải mã của
 * `cookies().getAll()`. Giờ đọc nguyên header `Cookie` của request.
 */
const RAW = `floraos_session=abc123; floraos_dev_role=${encodeURIComponent(JSON.stringify({ roleKey: "x", organizationType: "STORE", orgNameSuffix: "Đại lý" }))}`

vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: RAW }) }))

describe("header Cookie cho resolveSession", () => {
  it("giá trị đã giải mã (chữ Đ) làm new Request ném lỗi — đúng lỗi đã gặp", () => {
    const decoded = RAW.split("; ").map((c) => decodeURIComponent(c)).join("; ")
    expect(() => new Request("http://localhost/", { headers: { cookie: decoded } })).toThrow(/ByteString/)
  })

  it("requestCookieHeader trả nguyên header gốc, dựng Request được và giữ nguyên giá trị", async () => {
    const { requestCookieHeader } = await import("@/lib/request-cookie-header")
    const header = await requestCookieHeader()
    expect(header).toBe(RAW)
    const request = new Request("http://localhost/", { headers: { cookie: header } })
    expect(request.headers.get("cookie")).toContain("floraos_session=abc123")
  })

  it("không còn trang/layout nào ghép lại header Cookie từ cookies().getAll()", () => {
    const root = path.resolve(__dirname, "../../..")
    let hits = ""
    try {
      hits = execFileSync("grep", ["-rln", "--include=*.ts", "--include=*.tsx", "${c.name}=${c.value}", "src"], { cwd: root, encoding: "utf8" })
    } catch {
      hits = "" // grep thoát mã 1 khi không có kết quả
    }
    expect(hits.trim().split("\n").filter(Boolean)).toEqual([])
  })
})
