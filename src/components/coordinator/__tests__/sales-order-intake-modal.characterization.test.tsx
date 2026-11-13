import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Khoá hành vi (B5) trước khi chuyển lớp phủ tự viết sang Dialog. Dialog dùng portal nên mock để hiện nội dung tại chỗ.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: (p: { open: boolean; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode }) =>
    p.open ? <div data-dialog><h2>{p.title}</h2>{p.description}{p.children}</div> : null,
}))
vi.mock("@/components/coordinator/coordinator-api", () => ({
  coordinatorApi: new Proxy({}, { get: () => async () => [] }),
  errorMessage: (e: unknown) => String(e),
  uploadCoordinatorPhoto: async () => ({}),
}))

import { SalesOrderIntakeModal } from "@/components/templates/coordinator/sales-order-intake-modal"

const props = { onClose: () => undefined, onSubmit: async () => undefined }

describe("Hộp tiếp nhận đơn hàng — hành vi hiện có", () => {
  it("đóng → không hiện gì", () => {
    expect(renderToStaticMarkup(<SalesOrderIntakeModal {...props} isOpen={false} />)).toBe("")
  })

  it("mở → tiêu đề, mô tả, biểu mẫu với nút huỷ và nút tạo đơn", () => {
    const html = renderToStaticMarkup(<SalesOrderIntakeModal {...props} isOpen />)
    expect(html).toContain("Tiếp Nhận Đơn Hàng Mới")
    expect(html).toContain("Tạo đơn hàng từ bộ phận bán hàng và đưa ngay vào Tháp điều phối đơn")
    expect(html).toMatch(/<form[\s\S]*Hủy bỏ[\s\S]*Khởi Tạo Đơn &amp; Đưa Vào Tháp Điều Phối[\s\S]*<\/form>/)
    expect(html).toContain("Kiểm tra đủ thông tin đầu vào")
  })
})
