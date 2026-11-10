import { expect, test } from "@playwright/test"

import { STORE_NAV_ENTRIES } from "../../../src/components/layout/nav/nav-store"
import { activeDeliveryPhase, isHrefInPhase, phaseRoutes } from "../../../src/lib/delivery/delivery-phase"
import { createTestUserAndLogin } from "./helpers"

/**
 * Kế hoạch bàn giao GD1 — "Chế độ bật": menu chỉ còn mục trong phạm vi, URL ngoài phạm vi trả 404.
 * Chạy khi bản build có `NEXT_PUBLIC_DELIVERY_PHASE=gd1` (smeOS) hoặc là bản cắt (giai đoạn gắn sẵn).
 * Tiến trình Playwright đọc cùng biến và cùng danh sách route với bản build.
 */
const phase = activeDeliveryPhase()

test.describe("Chế độ giai đoạn bàn giao", () => {
  test.skip(!phase, "Bản build không bật giai đoạn bàn giao")

  test("menu chính của cửa hàng không còn mục trỏ tới trang ngoài phạm vi", async ({ page }) => {
    // Mục menu là nút (điều hướng bằng router), nên so theo tên mục: tên chỉ thuộc mục ngoài phạm vi không được hiện
    const inPhase = new Set(STORE_NAV_ENTRIES.filter((e) => isHrefInPhase(e.href, phase)).map((e) => e.label))
    const outOnly = [...new Set(STORE_NAV_ENTRIES.filter((e) => !isHrefInPhase(e.href, phase)).map((e) => e.label))].filter(
      (label) => !inPhase.has(label),
    )
    expect(outOnly.length).toBeGreaterThan(0)

    await createTestUserAndLogin(page)
    await page.goto("/")
    const nav = page.getByRole("navigation", { name: "Menu điều hướng" })
    await expect(nav).toBeVisible()
    // Mở lần lượt từng nhóm (nhóm có thể đóng nhóm khác khi mở), gom tên mục sau mỗi lần mở
    const seen = new Set<string>()
    const collect = async () => {
      for (const text of await nav.getByRole("button").allInnerTexts()) seen.add(text.trim())
    }
    await collect()
    const groups = nav.locator("button[aria-expanded]")
    const total = await groups.count()
    for (let i = 0; i < total; i += 1) {
      const group = groups.nth(i)
      // Bấm bằng sự kiện DOM: ô nổi của nhóm vừa mở có thể che nút nhóm kế tiếp
      if ((await group.getAttribute("aria-expanded")) === "false") await group.evaluate((el) => (el as HTMLElement).click())
      await collect()
    }
    const labels = [...seen]
    expect(labels).toContain("Đơn hàng")
    expect(labels.filter((label) => outOnly.includes(label))).toEqual([])
  })

  test("trang và API ngoài phạm vi trả 404, trong phạm vi mở được", async ({ page }) => {
    await createTestUserAndLogin(page)
    const blocked = ["/creative-studio", "/hoi-thoai", "/van-hanh/nganh", "/api/v1/proxy/api/accounts"]
    for (const path of blocked) {
      const res = await page.request.get(path, { maxRedirects: 0 })
      expect(res.status(), path).toBe(404)
    }
    for (const path of ["/don-hang", "/cong-cu", "/api/health"]) {
      const res = await page.request.get(path)
      expect(res.status(), path).toBe(200)
    }
    expect(phaseRoutes(phase!).pages).toContain("/don-hang")
  })

  test("thanh dưới trên điện thoại: không mục nào dẫn ra ngoài phạm vi, \"Thêm\" mở menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await createTestUserAndLogin(page)
    await page.goto("/")
    const bottomNav = page.getByRole("navigation", { name: "Điều hướng nhanh" })
    await expect(bottomNav).toBeVisible()
    const hrefs = await bottomNav.locator("a[href^='/']").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !isHrefInPhase(href, phase))).toEqual([])
    // Trang /them không giao: "Thêm" vẫn ở thanh dưới nhưng mở ngăn menu ☰, không chuyển trang
    if (!isHrefInPhase("/them", phase)) {
      await bottomNav.getByRole("button", { name: "Thêm" }).click()
      await expect(page.getByRole("dialog", { name: "Menu điều hướng" })).toBeVisible()
      await expect(page).toHaveURL(/\/$/)
    }
  })
})
