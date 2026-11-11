import { expect, test } from "@playwright/test"
import { createTestUserAndLogin } from "./helpers"

test.describe("Visual Regression (T7.1 / 03a UX-007)", () => {
  test.beforeEach(async ({ page }) => {
    // Tắt hiệu ứng CSS animation/transition để ảnh chụp ổn định
    await page.emulateMedia({ reducedMotion: "reduce" })
  })

  test("chụp trang 404 chuẩn UX (desktop & mobile)", async ({ page }) => {
    // Khổ mobile
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/khong-co-trang-nay")
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible()
    await expect(page).toHaveScreenshot("404-mobile.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
    })

    // Khổ desktop
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/khong-co-trang-nay")
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible()
    await expect(page).toHaveScreenshot("404-desktop.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
    })
  })

  test("chụp màn danh mục vai /vai-tro (desktop & mobile)", async ({ page }) => {
    await createTestUserAndLogin(page)

    // Khổ mobile
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/vai-tro")
    await expect(page.getByRole("heading", { name: "Vai trò" })).toBeVisible()
    await expect(page).toHaveScreenshot("vai-tro-mobile.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
    })

    // Khổ desktop
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/vai-tro")
    await expect(page.getByRole("heading", { name: "Vai trò" })).toBeVisible()
    await expect(page).toHaveScreenshot("vai-tro-desktop.png", {
      maxDiffPixelRatio: 0.05,
      animations: "disabled",
    })
  })

  test("chụp màn Trao đổi nội bộ /tin-nhan khi chưa có phòng (desktop & mobile)", async ({ page }) => {
    await createTestUserAndLogin(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/tin-nhan")
    await expect(page.getByRole("heading", { name: "Trao đổi nội bộ" })).toBeVisible()
    await expect(page.getByText("Chưa có phòng trao đổi")).toBeVisible()
    await expect(page).toHaveScreenshot("tin-nhan-mobile.png", { maxDiffPixelRatio: 0.05, animations: "disabled" })

    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/tin-nhan")
    await expect(page.getByText("Chọn một phòng để bắt đầu")).toBeVisible()
    await expect(page).toHaveScreenshot("tin-nhan-desktop.png", { maxDiffPixelRatio: 0.05, animations: "disabled" })
  })
})

