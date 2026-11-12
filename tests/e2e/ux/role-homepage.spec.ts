import { expect, test } from "@playwright/test"
import { createTestUserAndLogin } from "./helpers"

test.describe("UX Role-based Homepage (03b Role UX §4)", () => {
  test("vai Điều hành (dieu_hanh, PRODUCTION) vào trang chủ lựa chọn công việc của cửa hàng", async ({ page }) => {
    await createTestUserAndLogin(page, {
      roleKey: "dieu_hanh",
      workspaceKind: "PRODUCTION",
    })
    await page.goto("/")

    // Trang chủ chủ tiệm là Trung tâm Tiếp thị & Bán hàng (role-ux-catalog: TOOLKIT_HOME;
    // Screen Contract docs/dac-ta/screen-contracts/cong-cu.md, PO 01/11/2026): 6 thẻ mục tiêu kinh doanh.
    // Mục tiêu "Hồ sơ & Thương hiệu" có công cụ hoàn thiện nên luôn hiện ở production.
    await expect(page.getByRole("heading", { level: 1, name: "Trung tâm Tiếp thị & Bán hàng" })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole("heading", { level: 2, name: "Hồ sơ & Thương hiệu" })).toBeVisible()
  })

  test("vai Bán hàng (sale, PRODUCTION) vào trang chủ Pipeline Workspace", async ({ page }) => {
    await createTestUserAndLogin(page, {
      roleKey: "sale",
      workspaceKind: "PRODUCTION",
    })
    await page.goto("/")

    // Kiểm tra khối "Khách cần liên hệ" hoặc nút tạo đơn
    const contactBlock = page.locator("text=/Khách cần liên hệ|Tạo đơn nhanh|Tạo đơn/i")
    await expect(contactBlock.first()).toBeVisible({ timeout: 15_000 })
  })

  test("vai Điều phối (dieu_phoi, PRODUCTION) ở lại trang chủ chuỗi, không tự chuyển sang /dieu-phoi", async ({ page }) => {
    await createTestUserAndLogin(page, {
      roleKey: "dieu_phoi",
      workspaceKind: "PRODUCTION",
    })
    await page.goto("/")

    // PO 23/10/2026: mọi vai luôn thấy trang chủ sau đăng nhập; /dieu-phoi mở từ menu
    await expect(page.getByRole("heading", { level: 1, name: /Bạn muốn làm gì/i })).toBeVisible({ timeout: 15_000 })
    await expect(page).not.toHaveURL(/\/dieu-phoi/)
  })
})
