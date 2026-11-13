import { describe, it, expect } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import TruongDuLieuPage from "./page"

// Test tĩnh (không có DOM/click, cùng kiểu với
// `partner-product-card.test.ts`) — chỉ khoá lại việc trang dựng được
// không lỗi và tab mặc định ("Trường lõi") hiện đúng nhãn. `useEffect`
// (gọi API) không chạy khi dựng tĩnh — đây KHÔNG phải test tích hợp.
describe("Trang Console Trường dữ liệu (ĐP-3 3.15)", () => {
  it("dựng được trang, hiện đủ 4 tab và tab mặc định là Trường lõi", () => {
    const html = renderToStaticMarkup(createElement(TruongDuLieuPage))
    expect(html).toContain("Trường lõi")
    expect(html).toContain("Trường tự tạo")
    expect(html).toContain("Danh mục")
    expect(html).toContain("Ghi đè theo tổ chức")
    expect(html).toContain("Đang tải")
  })
})
