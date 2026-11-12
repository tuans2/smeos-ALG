import { describe, expect, it } from "vitest"

import { PARTNER_DIRECTORY_URL } from "@/components/coordinator/partner-management-modal"

/**
 * Màn "Quản lý" đối tác (thẻ xưởng, tạm ngưng bằng `PATCH /coordinator/partners/:id` mã R4, form tạo xưởng) từng tải
 * `GET /coordinator/partners` không tham số — nhánh đó trả đối tác CHUỖI, không phải xưởng gia công (rà 12/11/2026).
 */
describe("danh bạ xưởng gia công", () => {
  it("tải nhánh xưởng gia công (có `active`), lấy cả xưởng đang tạm ngưng", () => {
    const url = new URL(PARTNER_DIRECTORY_URL, "http://localhost")
    expect(url.pathname).toBe("/api/v1/coordinator/partners")
    expect(url.searchParams.get("active")).toBe("0")
  })
})
