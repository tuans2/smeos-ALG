import React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ShopLogo } from "../shop-info-sheet"
import type { ShopContact } from "@/modules/greeting-card/domain/shop-contact"

const base = { name: "Siin Store" } as ShopContact

describe("ShopLogo — chữ cái đầu không lẫn vào chữ hiển thị của nút", () => {
  it("vẽ chữ cái đầu bằng ::before từ data-initial, không để thành nội dung văn bản", () => {
    const html = renderToStaticMarkup(<ShopLogo shop={base} />)
    expect(html).toContain('data-initial="S"')
    expect(html).toContain("before:content-[attr(data-initial)]")
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toMatch(/>S</)
  })

  it("có logo thì dùng ảnh với alt rỗng", () => {
    const html = renderToStaticMarkup(<ShopLogo shop={{ ...base, logoUrl: "https://example.com/logo.png" }} />)
    expect(html).toContain("<img")
    expect(html).toContain('alt=""')
  })
})
