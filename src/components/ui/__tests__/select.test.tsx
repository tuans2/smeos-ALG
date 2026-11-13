import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../select"

describe("Select component", () => {
  it("renders with trigger, selected value, and base attributes", () => {
    const html = renderToStaticMarkup(
      <Select value="vip">
        <SelectTrigger aria-label="Chọn nhóm khách">
          <SelectValue placeholder="Chọn nhóm…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="standard">Khách thường</SelectItem>
          <SelectItem value="vip">Khách VIP</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(html).toContain('role="combobox"')
    expect(html).toContain("vip")
    expect(html).toContain("border-border")
    expect(html).toContain("bg-surface")
  })

  it("renders with error styling when error is true", () => {
    const html = renderToStaticMarkup(
      <Select>
        <SelectTrigger error aria-label="Lỗi lựa chọn">
          <SelectValue placeholder="Chọn..." />
        </SelectTrigger>
      </Select>
    )

    expect(html).toContain("border-danger")
    expect(html).toContain("focus-visible:outline-danger")
  })
})
