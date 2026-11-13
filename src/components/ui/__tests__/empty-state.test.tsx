import * as React from "react"
import { describe, it, expect, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { EmptyState } from "../empty-state"

describe("EmptyState component 4 variants (UX-P08)", () => {
  it("renders 'none' kind with default title and message", () => {
    const html = renderToStaticMarkup(<EmptyState kind="none" />)
    expect(html).toContain("Chưa có dữ liệu")
    expect(html).toContain("Bắt đầu tạo bản ghi đầu tiên của bạn.")
    expect(html).toContain('role="status"')
  })

  it("renders 'filtered' kind with action button", () => {
    const handleReset = vi.fn()
    const html = renderToStaticMarkup(
      <EmptyState
        kind="filtered"
        action={{ label: "Xoá bộ lọc", onClick: handleReset }}
      />
    )
    expect(html).toContain("Không tìm thấy kết quả")
    expect(html).toContain("Xoá bộ lọc")
  })

  it("renders 'forbidden' kind with warning tone", () => {
    const html = renderToStaticMarkup(<EmptyState kind="forbidden" />)
    expect(html).toContain("Không có quyền truy cập")
    expect(html).toContain("bg-warning-bg")
  })

  it("renders 'error' kind with alert role and danger tone", () => {
    const html = renderToStaticMarkup(<EmptyState kind="error" />)
    expect(html).toContain("Không thể nạp dữ liệu")
    expect(html).toContain('role="alert"')
    expect(html).toContain("bg-danger-bg")
  })
})
