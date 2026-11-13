import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

// Khoá hành vi (B5) trước khi chuyển lớp phủ tự viết sang Dialog. Dialog dùng portal nên mock để hiện nội dung tại chỗ.
vi.mock("@/components/ui/dialog", () => ({
  Dialog: (p: { open: boolean; title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode }) =>
    p.open ? <div data-dialog><h2>{p.title}</h2>{p.description}{p.children}{p.footer}</div> : null,
}))
vi.mock("@/components/coordinator/coordinator-api", () => ({
  coordinatorApi: { listPartners: async () => [] },
  errorMessage: (e: unknown) => String(e),
}))

import { PartnerAssignmentModal } from "@/components/templates/coordinator/partner-assignment-modal"

const props = {
  orderCode: "D-01", recipeTitle: "Bó hồng", deliveryAddress: { formattedAddress: "12 Lê Lợi, Q1" },
  deliveryTargetTime: "16:00", onClose: () => undefined, onAssign: async () => undefined,
}

describe("Hộp phân công đối tác — hành vi hiện có", () => {
  it("đóng → không hiện gì", () => {
    expect(renderToStaticMarkup(<PartnerAssignmentModal {...props} isOpen={false} />)).toBe("")
  })

  it("mở → tiêu đề, đơn, địa chỉ giao, đang tải, nút giao việc khoá khi chưa chọn", () => {
    const html = renderToStaticMarkup(<PartnerAssignmentModal {...props} isOpen />)
    expect(html).toContain("Phân Công Đối Tác")
    expect(html).toContain("Đơn #D-01: Bó hồng · Hẹn giao: 16:00")
    expect(html).toContain("12 Lê Lợi, Q1")
    expect(html).toContain("Đang tải danh sách đối tác")
    expect(html).toContain("Hủy bỏ")
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Xác Nhận Giao Việc/s)
  })
})
