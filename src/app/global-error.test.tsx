import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import GlobalError from "./global-error"

describe("GlobalError — trang lỗi gốc", () => {
  it("tự khai <title> vì layout gốc (và metadata) bị thay thế", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("x")} reset={() => {}} />)
    expect(html).toContain("<title>ALG tạm thời không tải được</title>")
    expect(html).toContain('lang="vi"')
  })

  it("giữ vùng thông báo lỗi và nút thử lại", () => {
    const html = renderToStaticMarkup(<GlobalError error={Object.assign(new Error("x"), { digest: "abc" })} reset={() => {}} />)
    expect(html).toContain('role="alert"')
    expect(html).toContain("Thử lại")
    expect(html).toContain("Mã lỗi: abc")
  })
})
