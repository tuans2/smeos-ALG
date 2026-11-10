import { expect, test } from "@playwright/test"

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

  test("menu chính chỉ còn trang trong phạm vi", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/")
    const nav = page.locator('aside[aria-label="Điều hướng chính"]')
    await expect(nav).toBeAttached()
    const hrefs = await nav.locator("a[href^='/']").evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""))
    expect(hrefs.length).toBeGreaterThan(0)
    expect(hrefs.filter((href) => !isHrefInPhase(href, phase))).toEqual([])
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
})
