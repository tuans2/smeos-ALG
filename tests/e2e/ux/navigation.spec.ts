import { expect, test } from "@playwright/test"
import { createTestUserAndLogin } from "./helpers"
import { ROLE_UX_CATALOG } from "../../../src/modules/organization/domain/role-ux-catalog"

test.describe("UX Navigation & Danh mục Vai (03a UX-001/03b Role UX)", () => {
  test("thanh điều hướng chính có mốc aria-label và cấu trúc chuẩn", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/")

    // Vùng điều hướng chính
    const nav = page.locator('aside[aria-label="Điều hướng chính"]')
    await expect(nav).toBeAttached()
  })

  test("màn danh mục vai /vai-tro hiển thị đúng số vai và trạng thái vô hiệu cho vai đang phát triển", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/vai-tro")

    await expect(page.getByRole("heading", { name: "Vai trò" })).toBeVisible()

    // Đếm tổng số vai đang phát triển trong danh mục
    const inDevelopmentCount = ROLE_UX_CATALOG.filter((r) => r.status === "IN_DEVELOPMENT").length
    const availableCount = ROLE_UX_CATALOG.filter((r) => r.status === "AVAILABLE").length

    // Các vai đang phát triển phải có aria-disabled="true"
    const disabledItems = page.locator('li[aria-disabled="true"]')
    await expect(disabledItems).toHaveCount(inDevelopmentCount)

    // Các vai đang dùng được hiển thị nhãn "Đang dùng được"
    const availableBadges = page.locator('span:has-text("Đang dùng được")')
    await expect(availableBadges).toHaveCount(availableCount)
  })
})
