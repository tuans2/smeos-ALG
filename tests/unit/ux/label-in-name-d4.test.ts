import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Đợt 4 (đo lại sau chụp kho): tên truy cập của nút phải chứa chữ nhìn thấy (WCAG 2.5.3, axe label-content-name-mismatch)
const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8")

describe("nhãn nút chứa chữ hiển thị", () => {
  it("thẻ sản phẩm: tên nút ảnh bằng chữ ẩn, không aria-label (ô 'Chưa có ảnh' là chữ nhìn thấy)", () => {
    const s = src("src/components/products/product-card.tsx")
    expect(s).not.toMatch(/aria-label=\{`Xem bảng thông số/)
    expect(s).toContain('<span className="sr-only">Xem bảng thông số và phân tích AI cho {product.name}</span>')
  })
  it("số điện thoại thành viên: nhãn bắt đầu bằng số hoặc 'Thêm số'", () => {
    expect(src("src/app/(app)/cai-dat/thanh-vien/_components/member-phone-action.tsx")).toContain('aria-label={`${member.phone || "Thêm số"} — số điện thoại của ${who}`}')
  })
  it("nút xuất dữ liệu và cài đặt mốc nhắc", () => {
    expect(src("src/components/orders/export-orders-button.tsx")).toContain("aria-label={`${label} danh sách đơn hàng`}")
    expect(src("src/components/crm/export-customers-button.tsx")).toContain('aria-label="Sao lưu & Xuất dữ liệu khách hàng"')
    expect(src("src/components/coordinator/coordinator-reminder-bar.tsx")).toContain('aria-label="Cài đặt mốc nhắc"')
  })
})
