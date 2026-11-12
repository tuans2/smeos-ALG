import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Button } from "../button"

describe("Button component", () => {
  it("renders with default props (variant primary, size default, type button)", () => {
    const html = renderToStaticMarkup(<Button>Bấm vào đây</Button>)
    expect(html).toContain("bg-primary")
    expect(html).toContain("h-12")
    expect(html).toContain('type="button"')
    expect(html).toContain("Bấm vào đây")
  })

  it("renders all variants with expected styling classes", () => {
    const sec = renderToStaticMarkup(<Button variant="secondary">Nút</Button>)
    expect(sec).toContain("bg-surface")
    expect(sec).toContain("text-primary")

    const outline = renderToStaticMarkup(<Button variant="outline">Nút</Button>)
    expect(outline).toContain("border-border")
    expect(outline).toContain("bg-transparent")

    const ghost = renderToStaticMarkup(<Button variant="ghost">Nút</Button>)
    expect(ghost).toContain("hover:bg-surface-alt")

    const warning = renderToStaticMarkup(<Button variant="warning">Nút</Button>)
    expect(warning).toContain("bg-warning")

    const danger = renderToStaticMarkup(<Button variant="danger">Nút</Button>)
    expect(danger).toContain("bg-danger")

    const subtle = renderToStaticMarkup(<Button variant="subtle">Nút</Button>)
    expect(subtle).toContain("bg-surface-alt")
  })

  it("renders all sizes with expected dimensions and touch target padding", () => {
    const sm = renderToStaticMarkup(<Button size="sm">Nút</Button>)
    expect(sm).toContain("h-11")

    const xs = renderToStaticMarkup(<Button size="xs">Nút</Button>)
    expect(xs).toContain("h-8")
    expect(xs).toContain("[@media(pointer:coarse)]:min-h-[44px]")

    const lg = renderToStaticMarkup(<Button size="lg">Nút</Button>)
    expect(lg).toContain("h-14")

    const icon = renderToStaticMarkup(<Button size="icon" aria-label="Icon">X</Button>)
    expect(icon).toContain("h-11")
    expect(icon).toContain("w-11")

    const iconSm = renderToStaticMarkup(<Button size="icon-sm" aria-label="Icon nhỏ">X</Button>)
    expect(iconSm).toContain("h-8")
    expect(iconSm).toContain("w-8")
    expect(iconSm).toContain("[@media(pointer:coarse)]:min-h-[44px]")
  })

  it("handles loading state: renders spinner, sets aria-busy, disables button", () => {
    const html = renderToStaticMarkup(<Button loading>Đang xử lý</Button>)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain("disabled")
    expect(html).toContain("animate-spin")
    expect(html).toContain("motion-reduce:hidden")
    expect(html).toContain("Đang xử lý")
  })

  it("handles disabled state: renders disabled attribute", () => {
    const html = renderToStaticMarkup(<Button disabled>Vô hiệu</Button>)
    expect(html).toContain("disabled")
  })

  it("supports asChild to render custom elements like links", () => {
    const html = renderToStaticMarkup(
      <Button asChild variant="outline">
        <a href="/test-url">Liên kết điều hướng</a>
      </Button>
    )
    expect(html).toContain("<a")
    expect(html).toContain('href="/test-url"')
    expect(html).toContain("border-border")
    expect(html).toContain("bg-transparent")
    expect(html).toContain("Liên kết điều hướng")
  })

  it("biến thể warning dùng chữ tối trên nền hổ phách (trắng chỉ đạt 3,33:1, dưới AA)", () => {
    const html = renderToStaticMarkup(<Button variant="warning">Cảnh báo</Button>)
    expect(html).toContain("bg-warning")
    expect(html).toContain("text-text")
    expect(html).not.toContain("text-white")
  })
})

describe("Button — icon không bị co (Đợt 4, D4-13)", () => {
  it("lớp gốc giữ kích thước icon khi nút có kích thước cố định và padding", () => {
    const html = renderToStaticMarkup(
      <Button variant="outline" className="h-11 w-11" aria-label="Hộp việc">
        <svg width="18" height="18" />
      </Button>,
    )
    expect(html).toContain("[&amp;_svg]:shrink-0")
  })
})
