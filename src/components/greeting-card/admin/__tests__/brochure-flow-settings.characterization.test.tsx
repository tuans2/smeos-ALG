import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Khoá hành vi (B5, KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md §0) trước khi sửa giao diện tab "Luồng thẻ chào":
// giá trị đọc từ Hồ sơ tiệm, trạng thái bật/tắt và câu chữ chính phải giữ nguyên.
vi.mock("@/components/greeting-card/greeting-api", () => ({
  useApi: () => ({ data: { settings: {} }, mutate: async () => undefined }),
  apiSend: async () => ({}),
}))

import { BrochureStepTimeoutSettings } from "../brochure-step-timeout-settings"
import { BrochureLanguageSettings } from "../brochure-language-settings"
import { StaffNotifySettings } from "../staff-notify-settings"

describe("Tab Luồng thẻ chào — hành vi hiện có", () => {
  it("thời hạn theo bước hiện giá trị mặc định 24 giờ, 12 giờ, 30 phút, 15 phút", () => {
    const html = renderToStaticMarkup(<BrochureStepTimeoutSettings />)
    expect(html).toContain("Thời hạn &amp; Tự động huỷ đơn theo bước")
    for (const v of ['value="24"', 'value="12"', 'value="30"', 'value="15"']) expect(html).toContain(v)
    expect(html).toContain("1. Tự động hủy nếu khách không mở link")
    expect(html).toContain("4. Tự động duyệt ảnh thành phẩm nếu khách không phản hồi")
  })

  it("ngôn ngữ: tiếng Việt luôn bật, tiếng Anh khoá khi chưa mở gói quốc tế", () => {
    const html = renderToStaticMarkup(<BrochureLanguageSettings />)
    expect(html).toContain("English (Tiếng Anh)")
    expect(html).toMatch(/aria-checked="true"[^>]*aria-disabled="true"|aria-disabled="true"[^>]*aria-checked="true"/)
    expect(html).toContain("Khóa")
  })
})

describe("Thông báo tức thì cho nhân viên — hành vi hiện có", () => {
  it("chưa có cấu hình → công tắc tắt, chưa hiện danh sách kênh", () => {
    const html = renderToStaticMarkup(<StaffNotifySettings />)
    expect(html).toContain('aria-checked="false"')
    expect(html).not.toContain("Kênh thông báo kích hoạt")
  })
})

describe("Tab Luồng thẻ chào — trợ năng (04/11/2026)", () => {
  it("mọi ô số và ô chọn có tên truy cập", () => {
    const timeout = renderToStaticMarkup(<BrochureStepTimeoutSettings />)
    for (const name of ["Số giờ chờ khách mở link", "Số giờ chờ khách chọn mẫu", "Số phút chờ khách thanh toán", "Số phút chờ khách duyệt ảnh"])
      expect(timeout).toContain(`aria-label="${name}"`)
    const language = renderToStaticMarkup(<BrochureLanguageSettings />)
    expect(language).toContain('aria-label="Tiếng Việt luôn bật"')
    expect(language).not.toContain("Admin SaaS")
    expect(renderToStaticMarkup(<StaffNotifySettings />)).toContain('aria-label="Bật thông báo tức thì cho nhân viên"')
  })
})
