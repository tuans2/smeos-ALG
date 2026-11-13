import { mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test, type Browser } from "@playwright/test"
import { createTestUserAndLogin } from "./helpers"
import {
  PRESETS,
  applyPreset,
  axeSevere,
  grantPlatformOperator,
  keyboardIssues,
  motionIssues,
  seedJourneyData,
  withDb,
  zoomIssues,
} from "./a11y-journeys.helpers"
import { seedSubcontractInvite } from "./subcontract-fixture"

/**
 * Trợ năng 12 hành trình (WCAG 2.2 AA) — docs/design-system/accessibility-audit-12-journeys.md.
 * Mỗi tuyến: axe, chỉ bàn phím (tiêu điểm thấy được, không bị che), phóng 200%, giảm chuyển động,
 * tương phản trên 3 preset. A11Y_REPORT_DIR=<thư mục> ghi kết quả JSON; A11Y_REPORT_ONLY=1 chỉ ghi, không chặn.
 */

type Route = { journey: string; path: string; auth: boolean; state?: string }
type Result = Route & { finalPath: string; axe: string[]; contrast: Record<string, string[]>; keyboard: { stops: number; issues: string[] }; zoom: string[]; motion: string[] }

const reportOnly = process.env.A11Y_REPORT_ONLY === "1"

/**
 * Lỗi đã biết trong vùng PO khoá (Catalog, Thẻ chào — `tests/unit/architecture/*-freeze.test.ts`):
 * chưa sửa khi chưa có duyệt; ghi tại `docs/design-system/accessibility-audit-12-journeys.md` §3. Gỡ dòng khi đã sửa.
 */
const KNOWN_FROZEN: { route: RegExp; issue: RegExp }[] = []
const isKnown = (path: string, issue: string) => KNOWN_FROZEN.some((k) => k.route.test(path) && k.issue.test(issue))
const results: Result[] = []

async function newPage(browser: Browser, opts: { auth: boolean; storage: string | undefined; reducedMotion?: boolean; viewport?: { width: number; height: number } }) {
  const context = await browser.newContext({
    ...(opts.auth && opts.storage ? { storageState: opts.storage } : {}),
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
    viewport: opts.viewport ?? { width: 1280, height: 800 },
  })
  return { context, page: await context.newPage() }
}

test.describe("Trợ năng 12 hành trình (WCAG 2.2 AA)", () => {
  test.describe.configure({ mode: "serial", timeout: 15 * 60_000 })
  let storage: string | undefined
  let routes: Route[] = []

  test.beforeAll(async ({ browser }) => {
    const { context, page } = await newPage(browser, { auth: false, storage: undefined })
    const user = await createTestUserAndLogin(page, { workspaceKind: "PRODUCTION" })
    await grantPlatformOperator(user.userId)
    const { productId, catalogSlug, greetingCatalogId, greetingCatalogCode, sendCode } = await seedJourneyData(page.request)
    const subcontractPath = await seedSubcontractInvite(user.orgId, user.userId)
    const orgSlug = await withDb(async (db) => (await db.query<{ slug: string }>("SELECT slug FROM organizations WHERE id = $1", [user.orgId])).rows[0]?.slug ?? "khong-co")
    storage = join(test.info().outputDir, "state.json")
    await context.storageState({ path: storage })
    await context.close()

    routes = [
      ...(catalogSlug ? [{ journey: "J01", path: `/c/${catalogSlug}`, auth: false }] : []),
      ...(sendCode ? [{ journey: "J01", path: `/b/${sendCode}`, auth: false }] : []),
      ...(greetingCatalogCode ? [{ journey: "J01", path: `/bst/${orgSlug}/${greetingCatalogCode}`, auth: false }] : []),
      ...(greetingCatalogId ? [{ journey: "J02", path: `/g/${greetingCatalogId}`, auth: false }] : []),
      { journey: "J01", path: "/b/KHONGTONTAI", auth: false, state: "không tìm thấy" },
      { journey: "J01", path: `/bst/${orgSlug}/khong-ton-tai`, auth: false, state: "không tìm thấy" },
      { journey: "J02", path: "/g/khong-ton-tai", auth: false, state: "không tìm thấy" },
      { journey: "J03", path: "/dang-nhap", auth: false },
      { journey: "J04", path: "/", auth: true },
      { journey: "J05", path: "/san-pham", auth: true },
      { journey: "J05", path: "/san-pham/tao-moi", auth: true },
      ...(productId ? [{ journey: "J05", path: `/san-pham/${productId}`, auth: true }] : []),
      { journey: "J06", path: "/don-hang", auth: true },
      { journey: "J07", path: "/khach-hang", auth: true },
      { journey: "J08", path: "/dieu-phoi", auth: true },
      { journey: "J08", path: "/dieu-phoi/doi-tac", auth: true },
      ...(subcontractPath ? [{ journey: "J09", path: subcontractPath, auth: false }] : []),
      { journey: "J09", path: "/subcontract/KHONGTONTAI", auth: false, state: "không tìm thấy" },
      { journey: "J10", path: "/so-lieu", auth: true },
      { journey: "J11", path: "/cai-dat", auth: true },
      { journey: "J11", path: "/uu-dai", auth: true },
      { journey: "J11", path: "/tich-hop", auth: true },
      { journey: "J12", path: "/van-hanh", auth: true },
    ]
  })

  test.afterAll(() => {
    const dir = process.env.A11Y_REPORT_DIR
    if (!dir) return
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, "a11y-journeys.json"), JSON.stringify({ measuredAt: new Date().toISOString(), presets: PRESETS, darkMode: "không có", results }, null, 2) + "\n")
  })

  test("mọi tuyến đạt axe, bàn phím, phóng 200%, giảm chuyển động và tương phản 3 preset", async ({ browser }) => {
    for (const route of routes) {
      const base = { auth: route.auth, storage }
      // 1. axe + bàn phím, khung 1280
      const main = await newPage(browser, base)
      await main.page.goto(route.path, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => undefined)
      const finalPath = new URL(main.page.url()).pathname
      const axe = await axeSevere(main.page)
      const contrast: Record<string, string[]> = {}
      for (const preset of PRESETS) {
        await applyPreset(main.page, preset)
        contrast[preset] = await axeSevere(main.page, ["color-contrast"])
      }
      await main.page.reload({ waitUntil: "networkidle" }).catch(() => undefined)
      const keyboard = await keyboardIssues(main.page)
      await main.context.close()

      // 2. Phóng 200%
      const zoom = await newPage(browser, { ...base, viewport: { width: 640, height: 400 } })
      await zoom.page.goto(route.path, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => undefined)
      const zoomRes = await zoomIssues(zoom.page)
      await zoom.context.close()

      // 3. Giảm chuyển động
      const motion = await newPage(browser, { ...base, reducedMotion: true })
      await motion.page.goto(route.path, { waitUntil: "networkidle", timeout: 90_000 }).catch(() => undefined)
      await motion.page.waitForTimeout(500)
      const motionRes = await motionIssues(motion.page)
      await motion.context.close()

      results.push({ ...route, finalPath, axe, contrast, keyboard, zoom: zoomRes, motion: motionRes })
    }

    if (reportOnly) return
    for (const r of results) {
      const where = `${r.journey} ${r.path}`
      const open = (issues: string[]) => issues.filter((i) => !isKnown(r.path, i))
      expect.soft(open(r.axe), `${where}: axe critical/serious`).toEqual([])
      for (const preset of PRESETS) expect.soft(open(r.contrast[preset] ?? []), `${where}: tương phản preset ${preset}`).toEqual([])
      expect.soft(open(r.keyboard.issues), `${where}: bàn phím`).toEqual([])
      expect.soft(r.zoom, `${where}: phóng 200%`).toEqual([])
      expect.soft(r.motion, `${where}: giảm chuyển động`).toEqual([])
    }
  })
})
