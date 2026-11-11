import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { Checkbox } from "../checkbox"
import { Switch } from "../switch"
import { RadioGroup, RadioGroupItem } from "../radio-group"

describe("Selection Controls (Checkbox, Switch, RadioGroup)", () => {
  it("renders Checkbox with checked state and aria-checked attribute", () => {
    const html = renderToStaticMarkup(<Checkbox checked aria-label="Đồng ý điều khoản" />)
    expect(html).toContain('role="checkbox"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain("data-checked")
    expect(html).toContain("bg-primary")
  })

  it("renders Switch with checked state and thumb indicator", () => {
    const html = renderToStaticMarkup(<Switch checked aria-label="Bật thông báo" />)
    expect(html).toContain('role="switch"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain("data-checked")
    expect(html).toContain("translate-x-5")
  })

  it("renders RadioGroup and items with selection", () => {
    const html = renderToStaticMarkup(
      <RadioGroup value="opt1" aria-label="Chọn ca làm việc">
        <RadioGroupItem value="opt1" aria-label="Ca sáng" />
        <RadioGroupItem value="opt2" aria-label="Ca tối" />
      </RadioGroup>
    )
    expect(html).toContain('role="radiogroup"')
    expect(html).toContain('role="radio"')
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain("bg-primary")
  })

  it("Checkbox mở rộng vùng bấm lên ≥ 24px và 44px trên màn cảm ứng mà không đổi kích thước hiển thị", () => {
    const html = renderToStaticMarkup(<Checkbox aria-label="Chọn" />)
    expect(html).toContain("h-5 w-5")
    expect(html).toContain("after:-inset-0.5")
    expect(html).toContain("[@media(pointer:coarse)]:after:-inset-3")
  })
})
