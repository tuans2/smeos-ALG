import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { LiveRegionProvider } from "../live-region"
import { ToastProvider } from "../toast"

describe("Toast component and LiveRegion integration", () => {
  it("renders ToastProvider and accessible viewport", () => {
    const html = renderToStaticMarkup(
      <LiveRegionProvider>
        <ToastProvider>
          <div>Ứng dụng chính</div>
        </ToastProvider>
      </LiveRegionProvider>
    )

    expect(html).toContain("Ứng dụng chính")
    // aria-label trên div không có role bị axe chặn (aria-prohibited-attr) — khung phải là region có tên.
    expect(html).toContain('role="region" aria-label="Thông báo nổi"')
    // Điện thoại: cách hai mép 16px (không tràn mép trái ở 360px); từ sm: góc phải trên.
    expect(html).toContain("fixed inset-x-4 top-4")
    expect(html).toContain("sm:inset-x-auto sm:right-4")
    expect(html).toContain('role="status"') // Live region
  })
})
