import { readdirSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  CHAIN_NAV_ENTRIES,
  HOME_ENTRY,
  INDUSTRY_NAV_ENTRIES,
  MOTHER_NAV_ENTRIES,
  STORE_NAV_ENTRIES,
  integrationsEntry,
} from "@/components/layout/nav"
import { NEXT_ACTIONS_REGISTRY } from "@/modules/journey/domain/next-actions-registry"
import { getAllTools } from "@/modules/toolkit/domain/toolkit-catalog"

/**
 * UJ-05 (audit hành trình 06/11/2026, N1): mục menu "Trợ lý tối ưu" (`/cong-cu/toi-uu-he-thong`) và
 * "Catalog toàn hệ thống" (`/van-hanh/san-pham`) dẫn tới trang không tồn tại (404). Mọi đường dẫn mà giao
 * diện đưa người dùng tới — menu bốn tầng, thẻ trong danh mục công cụ, gợi ý bước tiếp theo — phải khớp một
 * `page.tsx` thật.
 */
const APP_DIR = path.join(process.cwd(), "src/app")

function pageRoutes(dir = APP_DIR, segments: string[] = []): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      if (name === "api" && segments.length === 0) continue
      // Route group `(app)` không thành đoạn URL
      out.push(...pageRoutes(full, /^\(.*\)$/.test(name) ? segments : [...segments, name]))
    } else if (name === "page.tsx") {
      out.push("/" + segments.join("/"))
    }
  }
  return out
}

const PATTERNS = pageRoutes().map(
  (route) => new RegExp("^" + route.replace(/\[\.\.\.[^\]]+\]/g, ".+").replace(/\[[^\]]+\]/g, "[^/]+") + "/?$")
)

function pathOf(href: string): string {
  return href.split(/[?#]/)[0] || "/"
}

function exists(href: string): boolean {
  const p = pathOf(href)
  return PATTERNS.some((re) => re.test(p))
}

describe("đường dẫn điều hướng đều trỏ tới trang có thật", () => {
  it("tìm thấy trang để đối chiếu (bộ dò route không rỗng)", () => {
    expect(exists("/")).toBe(true)
    expect(exists("/don-hang")).toBe(true)
    expect(exists("/khong-co-trang-nay")).toBe(false)
  })

  it("menu bốn tầng", () => {
    const entries = [
      HOME_ENTRY,
      ...MOTHER_NAV_ENTRIES,
      ...INDUSTRY_NAV_ENTRIES,
      ...CHAIN_NAV_ENTRIES,
      ...STORE_NAV_ENTRIES,
      integrationsEntry("MOTHER", "x"),
      integrationsEntry("STORE", "x"),
    ]
    const broken = entries.filter((e) => !exists(e.href)).map((e) => `${e.label} → ${e.href}`)
    expect(broken).toEqual([])
  })

  it("thẻ công cụ bấm được trong danh mục công cụ", () => {
    const broken = getAllTools()
      .filter((t) => t.href !== null && !exists(t.href))
      .map((t) => `${t.name} → ${t.href}`)
    expect(broken).toEqual([])
  })

  it("gợi ý bước tiếp theo của hành trình", () => {
    const broken = Object.values(NEXT_ACTIONS_REGISTRY)
      .flat()
      .filter((a) => a.targetHref && !exists(a.targetHref))
      .map((a) => `${a.label} → ${a.targetHref}`)
    expect(broken).toEqual([])
  })
})
