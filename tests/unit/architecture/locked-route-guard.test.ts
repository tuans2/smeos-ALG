import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { activeDeliveryPhase, builtInDeliveryPhase, isRouteInPhase } from "@/lib/delivery/delivery-phase"
import { LOCKED_ROUTE_PREFIXES } from "@/lib/feature-lock"

/**
 * Audit L-03 (06/11 và 12/11/2026): 10 tuyến trong `LOCKED_ROUTE_PREFIXES` chỉ bị làm mờ trên sidebar, không có
 * `FeatureLockedGuard`, nên trên production gõ thẳng URL vẫn vào đủ chức năng. Mọi tuyến khoá phải có `layout.tsx`
 * bọc `FeatureLockedGuard` đúng tuyến đó, ở chính thư mục của tuyến (route group như `(app)` không tính là đoạn URL).
 *
 * Lọc theo giai đoạn bàn giao như `nav-href-exists.test.ts`: ở smeOS kiểm mọi tuyến khoá; ở bản cắt (giai đoạn gắn sẵn)
 * trang không giao đã bị xoá nên chỉ kiểm tuyến còn trong giai đoạn. `tests/setup.ts` tắt chế độ cho unit test.
 */
const APP_DIR = path.join(process.cwd(), "src/app")
const phase = activeDeliveryPhase() ?? builtInDeliveryPhase()
const ROUTES = LOCKED_ROUTE_PREFIXES.filter((route) => isRouteInPhase(route, phase))

/** Thư mục trong `src/app` ứng với một tuyến, bỏ qua route group `(…)`; null nếu không có. */
function routeDir(route: string, dir = APP_DIR, rest = route.split("/").filter(Boolean)): string | null {
  if (rest.length === 0) return dir
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    if (!statSync(full).isDirectory()) continue
    if (/^\(.*\)$/.test(name)) {
      const found = routeDir(route, full, rest)
      if (found) return found
    } else if (name === rest[0]) {
      const found = routeDir(route, full, rest.slice(1))
      if (found) return found
    }
  }
  return null
}

describe("tuyến khoá production có guard chặn cả URL gõ thẳng", () => {
  it("bộ dò thư mục tuyến hoạt động", () => {
    expect(routeDir("/gia")).not.toBeNull()
    expect(routeDir("/dieu-phoi/doi-tac")).not.toBeNull()
    expect(routeDir("/khong-co-tuyen-nay")).toBeNull()
  })

  it.each([...ROUTES])("%s", (route) => {
    const dir = routeDir(route)
    expect(dir, `không tìm thấy thư mục của ${route}`).not.toBeNull()
    const layout = path.join(dir!, "layout.tsx")
    expect(existsSync(layout), `${route} thiếu layout.tsx`).toBe(true)
    const source = readFileSync(layout, "utf8")
    expect(source).toContain("FeatureLockedGuard")
    expect(source).toContain(`route="${route}"`)
  })
})
