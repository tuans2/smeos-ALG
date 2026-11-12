import * as React from "react"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Slider } from "../slider"

describe("Slider (Đợt 4, D4-08)", () => {
  const html = renderToStaticMarkup(
    <Slider aria-label="Bán kính giao hàng" value={15} min={5} max={50} step={5} onValueChange={() => {}} getValueText={(v) => `${v} km`} />,
  )

  it("có input range ẩn mang nhãn truy cập và đúng khoảng giá trị", () => {
    expect(html).toContain('type="range"')
    expect(html).toContain('aria-label="Bán kính giao hàng"')
    expect(html).toMatch(/min="5"/)
    expect(html).toMatch(/max="50"/)
    expect(html).toMatch(/value="15"/)
  })

  it("chữ đọc cho trình đọc màn hình theo getValueText", () => {
    expect(html).toContain('aria-valuetext="15 km"')
  })

  it("vùng bấm 24px, 44px khi cảm ứng", () => {
    expect(html).toContain("h-6")
    expect(html).toContain("[@media(pointer:coarse)]:h-11")
  })
})
