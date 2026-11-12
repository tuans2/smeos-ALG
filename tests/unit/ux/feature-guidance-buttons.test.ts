import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

/**
 * T3-3 (quyết định 11/11/2026): hai nút mở/thu gọn của FeatureGuidanceCard (K1) dùng `Button` của hệ thống
 * thay cho `<button>` thô (lint R18), để có vùng bấm 44px trên màn cảm ứng; hình thức giữ nguyên.
 */
describe("FeatureGuidanceCard — nút dùng component chuẩn", () => {
  const src = readFileSync(path.resolve(__dirname, "../../../src/components/templates/shared/feature-guidance-card.tsx"), "utf-8")

  it("không còn thẻ <button> thô", () => {
    expect(src).not.toMatch(/<button\b/)
  })

  it("hai nút dùng Button size xs (có min-h 44px khi cảm ứng) và giữ chữ, màu hướng dẫn", () => {
    expect(src.match(/<Button\b[^>]*?size="xs"/gs)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(src).toContain("Xem hướng dẫn")
    expect(src).toContain("Thu gọn")
    expect(src).toContain("border-guidance-border")
  })
})
