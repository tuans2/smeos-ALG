import React from "react"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { FloatingItemSlot } from "../floating-item-slot"
import { FloatingLayerProvider } from "../floating-layer"

const src = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

describe("FloatingItemSlot (T3-2, layouts.md §3)", () => {
  it("không có provider thì hiện phần tử tại chỗ", () => {
    const html = renderToStaticMarkup(
      <FloatingItemSlot id="x" priority={1}>
        <span>nút nổi</span>
      </FloatingItemSlot>
    )
    expect(html).toContain("nút nổi")
  })

  it("trong provider thì không tự hiện tại chỗ mà để lớp nổi xếp chỗ", () => {
    const html = renderToStaticMarkup(
      <FloatingLayerProvider>
        <FloatingItemSlot id="x" priority={1}>
          <span>nút nổi</span>
        </FloatingItemSlot>
      </FloatingLayerProvider>
    )
    expect(html).toContain('aria-label="Các công cụ hỗ trợ nổi"')
    expect(html).not.toContain("nút nổi")
  })

  it("Copilot và UI Studio đăng ký qua lớp nổi, không tự định vị fixed", () => {
    const copilot = src("src/components/chat/floraos-global-copilot.tsx")
    const studio = src("src/components/layout/ui-studio-drawer.tsx")
    expect(copilot).toContain('<FloatingItemSlot id="copilot"')
    expect(studio).toContain('<FloatingItemSlot id="ui-studio"')
    expect(copilot).not.toContain("fixed top-1/2 right-3")
    expect(studio).not.toContain("fixed bottom-24 right-6")
  })
})
