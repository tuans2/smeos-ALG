import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

// PO 23/10/2026: sau đăng nhập mọi tài khoản luôn thấy trang chủ — "/" không chuyển tiếp.
describe("trang chủ (app)/page.tsx", () => {
  it("không chuyển tiếp sang tuyến khác cho bất kỳ vai nào", () => {
    const src = readFileSync("src/app/(app)/page.tsx", "utf8")
    expect(src).not.toMatch(/redirect\(/)
  })
})
