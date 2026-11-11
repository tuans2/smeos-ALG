import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { createTestUserAndLogin } from "./helpers"

/**
 * Màn Trao đổi nội bộ `/tin-nhan` (Screen Contract `SCR-STORE-tin-nhan`, kế hoạch chat nội bộ IC-9.4): tiêu đề, trạng
 * thái rỗng có hướng dẫn, không lỗi trợ năng nghiêm trọng, điện thoại một cột.
 */
test.describe("Trao đổi nội bộ (/tin-nhan)", () => {
  test("tài khoản mới: thấy tiêu đề và hướng dẫn khi chưa có phòng; không lỗi trợ năng critical / serious", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/tin-nhan")
    await expect(page.getByRole("heading", { name: "Trao đổi nội bộ" })).toBeVisible()
    await expect(page.getByText("Chưa có phòng trao đổi")).toBeVisible()
    await expect(page.getByRole("searchbox", { name: "Tìm phòng trao đổi" })).toBeVisible()

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([])
  })

  test("điện thoại (390 px): một cột — danh sách hiện, khung tin chờ chọn phòng bị ẩn", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createTestUserAndLogin(page)
    await page.goto("/tin-nhan")
    await expect(page.getByRole("searchbox", { name: "Tìm phòng trao đổi" })).toBeVisible()
    await expect(page.getByText("Chọn một phòng để bắt đầu")).toBeHidden()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
