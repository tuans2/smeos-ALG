import AxeBuilder from "@axe-core/playwright"
import type { APIRequestContext, Page } from "@playwright/test"
import { Client } from "pg"

/**
 * Phép kiểm trợ năng cho bộ 12 hành trình (docs/design-system/accessibility-audit-12-journeys.md).
 * Mỗi hàm trả về danh sách lỗi dạng chuỗi; rỗng = đạt.
 */

export const PRESETS = ["moc-lan", "modern-slate", "pure-swiss"] as const
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]
const MAX_TABS = 40

const dbUrl = process.env.DATABASE_URL || "postgresql://floraos:floraos@localhost:5432/floraos"

export async function withDb<T>(fn: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: dbUrl })
  await db.connect()
  try {
    return await fn(db)
  } finally {
    await db.end()
  }
}

/** axe WCAG 2.2 AA: vi phạm critical/serious. `only` giới hạn luật (vd chỉ color-contrast). */
export async function axeSevere(page: Page, only?: string[]): Promise<string[]> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS)
  if (only) builder = builder.withRules(only)
  const { violations } = await builder.analyze()
  return violations
    .filter((v) => v.impact === "critical" || v.impact === "serious")
    .map((v) => {
      const text = (v.nodes[0]?.html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 40)
      return `${v.id} (${v.impact}) × ${v.nodes.length}: ${v.nodes[0]?.target.join(" ") ?? ""} "${text}"`
    })
}

/**
 * Chỉ bàn phím: Tab qua tối đa 40 phần tử. Mỗi phần tử nhận tiêu điểm phải có vòng tiêu điểm
 * nhìn thấy (2.4.7) và không bị phần tử khác (header dính, thanh đáy) che hoàn toàn (2.4.11).
 */
export async function keyboardIssues(page: Page): Promise<{ stops: number; issues: string[] }> {
  const issues: string[] = []
  const seen = new Set<string>()
  let stops = 0
  for (let i = 0; i < MAX_TABS; i++) {
    await page.keyboard.press("Tab")
    // Chờ cuộn (kể cả cuộn mượt của trang hoặc dải tab) đưa phần tử vào khung nhìn xong rồi mới đo.
    await page.evaluate(async () => {
      const el = document.activeElement
      if (!el) return
      let last = ""
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(() => r(null)))
        const r = el.getBoundingClientRect()
        const now = `${Math.round(r.top)}:${Math.round(r.left)}`
        if (now === last) return
        last = now
      }
    })
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      // Vòng tiêu điểm có thể vẽ trên chính phần tử hoặc trên ::before/::after (mẫu "cả thẻ là nút").
      const drawn = [getComputedStyle(el), getComputedStyle(el, "::before"), getComputedStyle(el, "::after")]
      const outline = drawn.some((cs) => cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0)
      const ring = drawn.some((cs) => cs.boxShadow !== "none")
      const r = el.getBoundingClientRect()
      const pts: [number, number][] = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 2, r.top + 2],
        [r.right - 2, r.bottom - 2],
      ]
      const visiblePart = pts.some(([x, y]) => {
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false
        const hit = document.elementFromPoint(x, y)
        return !!hit && (hit === el || el.contains(hit) || hit.contains(el))
      })
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40)
      const key = `${el.tagName}|${label}|${Math.round(r.top + scrollY)}|${Math.round(r.left)}`
      return { key, label: `<${el.tagName.toLowerCase()}> "${label}"`, focusVisible: outline || ring, visiblePart, size: r.width * r.height }
    })
    if (!info) continue
    if (seen.has(info.key)) break // đã quay vòng
    seen.add(info.key)
    stops++
    if (info.size === 0) continue
    if (!info.focusVisible) issues.push(`2.4.7 không thấy vòng tiêu điểm: ${info.label}`)
    if (!info.visiblePart) issues.push(`2.4.11 tiêu điểm bị che: ${info.label}`)
  }
  return { stops, issues }
}

/** Phóng 200% (1280×800 → khung 640×400 CSS px): không cuộn ngang (1.4.4, 1.4.10). */
export async function zoomIssues(page: Page): Promise<string[]> {
  const { sw, cw } = await page.evaluate(() => ({
    sw: document.scrollingElement?.scrollWidth ?? 0,
    cw: document.scrollingElement?.clientWidth ?? 0,
  }))
  return sw > cw + 1 ? [`cuộn ngang ${sw - cw}px ở khung 640px`] : []
}

/** Giảm chuyển động (2.3.3): không còn animation chạy lặp hoặc dài hơn 0,1 s. */
export async function motionIssues(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        if (a.playState !== "running") return false
        const t = a.effect?.getComputedTiming()
        const dur = typeof t?.duration === "number" ? t.duration : 0
        return t?.iterations === Infinity || dur > 100
      })
      .map((a) => {
        const target = (a.effect as KeyframeEffect | null)?.target as Element | null
        return `animation chạy: ${target?.tagName.toLowerCase() ?? "?"}.${(target?.getAttribute("class") ?? "").split(" ").slice(0, 3).join(".")}`
      }),
  )
}

/**
 * Áp preset giao diện trên trang đang mở. Đổi mọi phần tử mang `data-theme`, không chỉ `<html>`:
 * khung `AppShell` gắn `data-theme` riêng (theme của tầng), nên chỉ đổi `<html>` thì nội dung trong
 * shell vẫn giữ preset cũ và phép đo "3 preset" thực chất chỉ đo một preset.
 */
export async function applyPreset(page: Page, preset: string): Promise<void> {
  await page.evaluate((p) => {
    document.documentElement.setAttribute("data-theme", p)
    for (const el of document.querySelectorAll("[data-theme]")) el.setAttribute("data-theme", p)
  }, preset)
  await page.waitForTimeout(150)
}

export type JourneyData = {
  productId: string | null
  catalogSlug: string | null
  greetingCatalogId: string | null
  greetingCatalogCode: string | null
  sendCode: string | null
}

async function postJson<T>(request: APIRequestContext, url: string, data: unknown): Promise<T | null> {
  const res = await request.post(url, { data })
  if (!res.ok()) return null
  const body = (await res.json()) as { data?: T } & T
  return (body.data ?? body) as T
}

/**
 * Dữ liệu cho tuyến cần mã, tạo qua chính API của ứng dụng: một sản phẩm, một trang catalog công khai,
 * một bộ sưu tập Thẻ chào chứa sản phẩm đó và một link gửi cho khách (`/b`, `/bst`, `/g`).
 */
export async function seedJourneyData(request: APIRequestContext): Promise<JourneyData> {
  const suffix = Date.now().toString(36).toUpperCase()
  const product = await postJson<{ id?: string }>(request, "/api/v1/products", {
    code: `A11Y-${suffix}`,
    name: "Bó hoa kiểm trợ năng",
    status: "ACTIVE",
  })
  const link = await postJson<{ slug?: string }>(request, "/api/v1/catalog-links", { name: "Bộ sưu tập kiểm trợ năng" })
  const productId = product?.id ?? null
  const catalog = productId
    ? await postJson<{ id?: string; code?: string }>(request, "/api/v1/greeting-card/catalogs", {
        code: `kiem-tro-nang-${suffix.toLowerCase()}`,
        name: "Bộ sưu tập kiểm trợ năng",
        productIds: [productId],
      })
    : null
  const send = catalog?.id
    ? await postJson<{ sendCode?: string }>(request, "/api/v1/greeting-card/send-links", {
        catalogId: catalog.id,
        customerName: "Khách kiểm trợ năng",
      })
    : null
  return {
    productId,
    catalogSlug: link?.slug ?? null,
    greetingCatalogId: catalog?.id ?? null,
    greetingCatalogCode: catalog?.code ?? null,
    sendCode: send?.sendCode ?? null,
  }
}

/** Cấp quyền vận hành nền tảng (N1, N4, N5) cho tài khoản kiểm để mở /van-hanh. */
export async function grantPlatformOperator(userId: string): Promise<void> {
  await withDb(async (db) => {
    const op = await db.query<{ id: string }>(
      `INSERT INTO platform_operators (id, user_id, created_at) VALUES (gen_random_uuid()::text, $1, now())
       ON CONFLICT (user_id) DO UPDATE SET revoked_at = NULL RETURNING id`,
      [userId],
    )
    for (const code of ["N1", "N4", "N5"]) {
      await db.query(
        `INSERT INTO platform_role_capabilities (id, operator_id, capability_code) VALUES (gen_random_uuid()::text, $1, $2)
         ON CONFLICT (operator_id, capability_code) DO NOTHING`,
        [op.rows[0]!.id, code],
      )
    }
  })
}
