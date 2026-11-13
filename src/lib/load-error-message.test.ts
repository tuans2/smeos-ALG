import { describe, expect, it } from "vitest"

import { orderPrintLoadError, productLoadError } from "./load-error-message"

describe("câu báo khi màn chi tiết không tải được (GD1 Bước 6, S-01)", () => {
  it("404 → Không tìm thấy, không kèm mã lỗi", () => {
    expect(productLoadError(404)).toBe("Không tìm thấy sản phẩm này.")
    expect(orderPrintLoadError(404)).toBe("Không tìm thấy đơn hàng này.")
    for (const s of [404, 500]) expect(productLoadError(s) + orderPrintLoadError(s)).not.toMatch(/\d{3}/)
  })

  it("401, 403 của phiếu in có câu riêng", () => {
    expect(orderPrintLoadError(401)).toContain("đăng nhập")
    expect(orderPrintLoadError(403)).toContain("quyền")
  })
})
