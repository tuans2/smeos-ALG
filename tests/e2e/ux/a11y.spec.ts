import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { createTestUserAndLogin } from "./helpers"

test.describe("Quét Trợ Năng Tự Động (03a UX-006 / WCAG 2.2 AA)", () => {
  test("trang 404 không có lỗi trợ năng critical hoặc serious", async ({ page }) => {
    await page.goto("/khong-co-trang-nay")
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()

    const severeViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    )
    expect(severeViolations).toEqual([])
  })

  test("trang chủ (/) không có lỗi trợ năng critical hoặc serious", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()

    const severeViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    )
    expect(severeViolations).toEqual([])
  })

  test("màn hình danh mục vai (/vai-tro) không có lỗi trợ năng critical hoặc serious", async ({ page }) => {
    await createTestUserAndLogin(page)
    await page.goto("/vai-tro")

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze()

    const severeViolations = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    )
    expect(severeViolations).toEqual([])
  })
})
