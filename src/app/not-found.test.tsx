import * as React from "react"
import { describe, expect, it, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }))
import RootNotFound from "./not-found"

// Đợt 4 D4-04: trang 404 gốc (ngoài khung ứng dụng) có vùng main và đúng một h1.
describe("RootNotFound", () => {
  it("có <main> và một <h1>", () => {
    const html = renderToStaticMarkup(<RootNotFound />)
    expect(html.startsWith("<main")).toBe(true)
    expect((html.match(/<h1/g) ?? []).length).toBe(1)
    expect(html).not.toContain("<h2")
  })
})
