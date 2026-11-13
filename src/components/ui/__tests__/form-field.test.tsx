import * as React from "react"
import { describe, it, expect } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { FormField, FormLabel, FormDescription, FormMessage } from "../form-field"
import { Input } from "../input"
import { Textarea } from "../textarea"

describe("FormField & Form Controls", () => {
  it("renders a standalone Input with custom class and attributes", () => {
    const html = renderToStaticMarkup(
      <Input placeholder="Nhập tên sản phẩm" inputSize="sm" />
    )
    expect(html).toContain('placeholder="Nhập tên sản phẩm"')
    expect(html).toContain("h-9")
    expect(html).toContain("bg-surface")
  })

  it("renders standalone Input in error state with aria-invalid", () => {
    const html = renderToStaticMarkup(<Input hasError />)
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain("border-danger")
  })

  it("auto-wires IDs, labels, aria-invalid, and descriptions inside FormField", () => {
    const html = renderToStaticMarkup(
      <FormField id="product-name" required error="Tên sản phẩm không được để trống">
        <FormLabel>Tên sản phẩm</FormLabel>
        <Input placeholder="Nhập tên…" />
        <FormDescription>Tên hiển thị trên catalog và đơn hàng</FormDescription>
        <FormMessage>Tên sản phẩm không được để trống</FormMessage>
      </FormField>
    )

    // Check label connects to id
    expect(html).toContain('for="product-name"')
    expect(html).toContain("*") // Required mark

    // Check input gets id, required, aria-invalid, describedBy
    expect(html).toContain('id="product-name"')
    expect(html).toContain("required")
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('aria-describedby="product-name-description product-name-error"')

    // Check description and error IDs
    expect(html).toContain('id="product-name-description"')
    expect(html).toContain('id="product-name-error"')
    expect(html).toContain('role="alert"')
  })

  it("renders Textarea with FormField wiring", () => {
    const html = renderToStaticMarkup(
      <FormField id="product-desc">
        <FormLabel showOptional>Mô tả chi tiết</FormLabel>
        <Textarea rows={4} placeholder="Nhập ghi chú…" />
      </FormField>
    )

    expect(html).toContain('for="product-desc"')
    expect(html).toContain("(Tuỳ chọn)")
    expect(html).toContain("<textarea")
    expect(html).toContain('id="product-desc"')
    expect(html).toContain('rows="4"')
    expect(html).toContain("resize-y")
  })
})
