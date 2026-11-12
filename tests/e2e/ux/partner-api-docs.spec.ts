import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

import { isHrefInPhase } from "../../../src/lib/delivery/delivery-phase"
import { createTestUserAndLogin } from "./helpers"

/**
 * Tài liệu API cho đối tác (SCR-STORE-tich-hop-tai-lieu-api, ARC-024 B5): trang sau đăng nhập, quyền F9 (vai Điều hành
 * mặc định có). Kiểm 390px và 1280px: một <h1>, không cuộn ngang, axe sạch critical/serious, mở một endpoint thấy
 * trường sắp gỡ có nhãn bằng chữ. Vai không có F9 thấy lý do thay cho nội dung.
 */
const PATH = "/tich-hop/tai-lieu-api"
const severe = async (page: import("@playwright/test").Page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => v.id)

test.describe("Tài liệu API cho đối tác", () => {
  // Bản cắt bàn giao không có trang này (ngoài phạm vi GD1)
  test.skip(!isHrefInPhase(PATH), "trang không thuộc giai đoạn bàn giao đang bật")

  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    test(`Điều hành đọc được hướng dẫn và tham chiếu (${viewport.width}px)`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await createTestUserAndLogin(page)
      await page.goto(PATH)

      await expect(page.getByRole("heading", { level: 1, name: "Tài liệu API cho đối tác" })).toBeVisible()
      await expect(page.getByRole("note")).toContainText("Sắp gỡ")
      await expect(page.getByText("Authorization: Bearer", { exact: false }).first()).toBeVisible()
      const scrollsSideways = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
      expect(scrollsSideways).toBe(false)
      expect(await severe(page)).toEqual([])

      const jobs = page.getByRole("button", { name: /POST \/integration\/jobs/ })
      await jobs.click()
      await expect(jobs).toHaveAttribute("aria-expanded", "true")
      // Chỉ xét khung của endpoint vừa mở — các endpoint khác vẫn đóng
      const panel = page.locator(`[id="${await jobs.getAttribute("aria-controls")}"]`)
      await expect(panel.getByText("Sắp gỡ", { exact: true }).first()).toBeVisible()
      await expect(panel.getByText("payload", { exact: true }).first()).toBeVisible()
      expect(await severe(page)).toEqual([])
    })
  }

  test("vai không có quyền quản lý khoá ứng dụng thấy lý do, không thấy tham chiếu", async ({ page }) => {
    await createTestUserAndLogin(page, { roleKey: "sale" })
    await page.goto(PATH)
    await expect(page.getByText("chưa được quản lý khoá ứng dụng", { exact: false })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Tham chiếu" })).toHaveCount(0)
  })
})
