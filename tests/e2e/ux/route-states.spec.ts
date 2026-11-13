import { expect, test } from "@playwright/test"
import { createTestUserAndLogin } from "./helpers"

test.describe("UX Route States & Landmark (03a UX-001/UX-006)", () => {
  test("tuyến không tồn tại hiển thị trang 404 chuẩn UX (T1.1)", async ({ page }) => {
    await page.goto("/khong-co-trang-nay")

    // Hiển thị nội dung trang not-found.tsx
    await expect(page.getByRole("heading", { name: "Không tìm thấy trang" })).toBeVisible()
    await expect(page.getByText("Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.")).toBeVisible()

    // Có nút về trang chủ
    const nutVeTrangChu = page.getByRole("link", { name: "Về trang chủ" })
    await expect(nutVeTrangChu).toBeVisible()
  })

  test("liên kết bỏ qua tới nội dung (Skip to content) và mốc nội dung chính (T1.9)", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/")

    // Thẻ skip link phải tồn tại trong DOM
    const skipLink = page.locator('a[href="#noi-dung-chinh"]')
    await expect(skipLink).toBeAttached()
    await expect(skipLink).toHaveText("Bỏ qua tới nội dung")

    // Vùng nội dung chính phải có id="noi-dung-chinh" và tabIndex=-1
    const mainContent = page.locator("#noi-dung-chinh")
    await expect(mainContent).toBeAttached()
    await expect(mainContent).toHaveAttribute("tabindex", "-1")
  })
})
