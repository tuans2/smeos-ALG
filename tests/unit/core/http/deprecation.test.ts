import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import {
  audienceOf,
  DEPRECATIONS,
  deprecationHeaders,
  noticeDays,
  NOTICE_DAYS,
  withDeprecationHeaders,
  type Deprecation,
} from "@/core/http/deprecation"

/**
 * Chính sách gỡ endpoint (PO 07/11/2026, audit API-14): báo trước ≥ 90 ngày cho `/integration/*` và
 * `/public/*`, ≥ 30 ngày cho API nội bộ; quá ngày gỡ mà route còn → đỏ; mục khai phải có trong đặc tả 06.
 */
const ROOT = path.resolve(__dirname, "../../../..")
const SPEC = readFileSync(path.join(ROOT, "docs/dac-ta/06-api-specification.md"), "utf8")

function routeFile(entry: Deprecation): string {
  return path.join(ROOT, "src/app", entry.path, "route.ts")
}

/** `/api/v1/orders/[id]` → `/orders/:id` như cột Path của đặc tả 06. */
const specPath = (entry: Deprecation) => entry.path.replace("/api/v1", "").replace(/\[(?:\.\.\.)?(\w+)\]/g, ":$1")

function violations(entries: readonly Deprecation[], today: string, spec: string, routeExists: (e: Deprecation) => boolean): string[] {
  return entries.flatMap((entry) => {
    const key = `${entry.method} ${entry.path}`
    const out: string[] = []
    const need = NOTICE_DAYS[audienceOf(entry.path)]
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.announced) || !/^\d{4}-\d{2}-\d{2}$/.test(entry.sunset)) out.push(`${key}: ngày phải là YYYY-MM-DD`)
    else if (noticeDays(entry) < need) out.push(`${key}: báo trước ${noticeDays(entry)} ngày < ${need} (${audienceOf(entry.path)})`)
    if (entry.sunset < today && routeExists(entry)) out.push(`${key}: đã quá ngày gỡ ${entry.sunset} mà route còn — gỡ route hoặc dời ngày`)
    if (!routeExists(entry)) out.push(`${key}: không có route — xoá mục`)
    const line = spec.split("\n").find((row) => row.includes(`\`${specPath(entry)}\``) && row.toUpperCase().startsWith(`| ${entry.method}`))
    if (!line || !line.includes("SẮP GỠ")) out.push(`${key}: dòng đặc tả 06 phải ghi **SẮP GỠ** kèm ngày gỡ`)
    return out
  })
}

const today = new Date().toISOString().slice(0, 10)

describe("chính sách gỡ endpoint", () => {
  it("bề mặt suy từ tiền tố: /integration và /public là bên ngoài", () => {
    expect(audienceOf("/api/v1/integration/products")).toBe("external")
    expect(audienceOf("/api/v1/public/catalog/[slug]")).toBe("external")
    expect(audienceOf("/api/v1/orders")).toBe("internal")
  })

  it("header theo RFC 9745 (Deprecation) và RFC 8594 (Sunset)", () => {
    const entry: Deprecation = { method: "GET", path: "/api/v1/orders/[id]", announced: "2026-11-07", sunset: "2026-12-07", successor: "/api/v1/orders/[id]/v2", reason: "thử" }
    expect(deprecationHeaders(entry)).toEqual({
      Deprecation: `@${Date.UTC(2026, 10, 7) / 1000}`,
      Sunset: "Mon, 07 Dec 2026 00:00:00 GMT",
      Link: '</api/v1/orders/[id]/v2>; rel="successor-version"',
    })
  })

  it("gắn header cho đúng method + đường dẫn khớp mẫu, bỏ qua phần còn lại", () => {
    const registry: Deprecation[] = [{ method: "GET", path: "/api/v1/orders/[id]", announced: "2026-11-07", sunset: "2026-12-07", reason: "thử" }]
    const hit = withDeprecationHeaders(new Response("{}"), "GET", "/api/v1/orders/o-1", registry)
    expect(hit.headers.get("sunset")).toBe("Mon, 07 Dec 2026 00:00:00 GMT")
    expect(hit.headers.get("link")).toBeNull()
    expect(withDeprecationHeaders(new Response("{}"), "POST", "/api/v1/orders/o-1", registry).headers.get("sunset")).toBeNull()
    expect(withDeprecationHeaders(new Response("{}"), "GET", "/api/v1/orders/o-1/assign", registry).headers.get("sunset")).toBeNull()
  })

  it("phép kiểm luật bắt đủ các vi phạm (mục giả)", () => {
    const fake: Deprecation[] = [
      { method: "GET", path: "/api/v1/integration/products", announced: "2026-11-07", sunset: "2026-12-07", reason: "báo 30 ngày cho bề mặt ngoài" },
      { method: "GET", path: "/api/v1/orders", announced: "2026-01-01", sunset: "2026-02-15", reason: "đã quá ngày gỡ" },
      { method: "GET", path: "/api/v1/khong-ton-tai", announced: "2026-11-07", sunset: "2027-03-01", reason: "route không có" },
    ]
    const found = violations(fake, "2026-11-07", "", (e) => existsSync(routeFile(e)))
    expect(found.some((v) => v.includes("báo trước 30 ngày < 90"))).toBe(true)
    expect(found.some((v) => v.includes("đã quá ngày gỡ"))).toBe(true)
    expect(found.some((v) => v.includes("không có route"))).toBe(true)
    expect(found.some((v) => v.includes("SẮP GỠ"))).toBe(true)
  })

  it("DEPRECATIONS tuân thủ chính sách", () => {
    expect(violations(DEPRECATIONS, today, SPEC, (e) => existsSync(routeFile(e)))).toEqual([])
  })
})
