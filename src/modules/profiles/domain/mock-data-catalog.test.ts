import { describe, expect, it } from "vitest"
import { MOCK_ASSETS_CATALOG } from "./mock-data-catalog"

/** PO 06/11/2026: dữ liệu mẫu theo ngành không dùng ảnh kho — chỉ ảnh nội bộ /mock-data/ hoặc để trống. */
describe("dữ liệu mẫu theo ngành", () => {
  it("mọi ảnh là đường dẫn nội bộ hoặc rỗng", () => {
    for (const [industry, a] of Object.entries(MOCK_ASSETS_CATALOG)) {
      for (const url of [a.logo, a.storeBanner, ...a.products.map((p) => p.image)]) {
        expect(url === "" || url.startsWith("/mock-data/"), `${industry}: ${url}`).toBe(true)
      }
    }
  })
})
