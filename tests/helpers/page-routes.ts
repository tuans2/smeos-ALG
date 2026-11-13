import { readdirSync, statSync } from "node:fs"
import path from "node:path"

/** Route trang có thật trong `src/app` — dùng cho test đường dẫn điều hướng (`nav-href-exists*.test.ts`). */
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

export function pageExists(href: string): boolean {
  const p = pathOf(href)
  return PATTERNS.some((re) => re.test(p))
}
