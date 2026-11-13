import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Khoá hành vi (B5) trước khi chuyển <input> thô sang <Input> và trạng thái nút chép ảnh sang TaskUiState.
vi.mock("@/components/greeting-card/greeting-api", () => ({
  useApi: () => ({ data: { data: { notify: { enabled: true, channel: "ZNS", configured: true, templates: {} } } }, mutate: async () => undefined }),
  apiSend: async () => ({}),
}))

import { OrderNoteField } from "../customer/order-notes-fields"
import { BrochureNotifySettings } from "../admin/brochure-notify-settings"
import { CopyProductImageButton } from "../copy-product-image-button"

describe("Thẻ chào — ô nhập & nút chép ảnh: hành vi hiện có", () => {
  it("ô link bản đồ: type url, inputMode url, id, maxLength, gợi ý", () => {
    const html = renderToStaticMarkup(
      <OrderNoteField kind="mapUrl" idPrefix="o" value="https://maps.app" inputClassName="x-field" onChange={() => undefined} />,
    )
    expect(html).toMatch(/<input[^>]*type="url"/)
    expect(html).toContain('inputMode="url"')
    expect(html).toContain('id="o-mapUrl"')
    expect(html).toContain('for="o-mapUrl"')
    expect(html).toContain('value="https://maps.app"')
    expect(html).toMatch(/maxLength="\d+"/)
    expect(html).toContain("x-field")
    expect(html).toContain("Giúp người giao tìm đúng chỗ")
  })

  it("ghi chú giao hàng: ô text, không có inputMode", () => {
    const html = renderToStaticMarkup(
      <OrderNoteField kind="deliveryNote" idPrefix="o" value="" inputClassName="x" onChange={() => undefined} />,
    )
    expect(html).toMatch(/<input[^>]*type="text"/)
    expect(html).not.toContain("inputMode")
    expect(html).toContain("Gọi trước 15 phút")
  })

  it("cấu hình thông báo: khoá bí mật là ô mật khẩu, tắt tự điền, báo đã lưu", () => {
    const html = renderToStaticMarkup(<BrochureNotifySettings />)
    expect(html).toMatch(/<input[^>]*type="password"/)
    expect(html).toMatch(/<input[^>]*type="text"/)
    expect(html).toContain('autoComplete="off"')
    expect(html).toContain("Đã lưu — để trống nếu không đổi")
  })

  it("nút chép ảnh: chưa có ảnh thì bị khoá; có ảnh thì sẵn sàng", () => {
    const none = renderToStaticMarkup(<CopyProductImageButton imageUrl={null} />)
    expect(none).toContain('disabled=""')
    expect(none).toContain("Mẫu này chưa có ảnh")
    const ok = renderToStaticMarkup(<CopyProductImageButton imageUrl="/a.png" />)
    expect(ok).not.toContain('disabled=""')
    expect(ok).toContain("Copy ảnh sản phẩm")
  })
})
