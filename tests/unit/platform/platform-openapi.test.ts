import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { buildPlatformOpenApi, PLATFORM_OPENAPI_PATH, PLATFORM_OPERATIONS } from "@/app/api/v1/platform/_contracts/platform-openapi"
import { serializeOpenApi } from "@/core/http/openapi"

/**
 * OpenAPI của Console Vận hành Nền tảng `/platform/*` (PO 07/11/2026) — gác bằng `npm test`: tệp đã commit khớp
 * bản sinh; mỗi method của mỗi route có đúng một operation và ngược lại; mã năng lực khớp đặc tả 06.
 */
const ROOT = path.resolve(__dirname, "../../..")
const PLATFORM = path.join(ROOT, "src/app/api/v1/platform")

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return entry.startsWith("_") ? [] : routeFiles(full)
    return entry === "route.ts" ? [full] : []
  })
}
const openApiPath = (file: string) =>
  `/platform/${path.relative(PLATFORM, path.dirname(file)).split(path.sep).join("/")}`.replace(/\[(\w+)\]/g, "{$1}")

describe("OpenAPI — Console Vận hành Nền tảng", () => {
  it("tệp đã commit khớp bản sinh từ mã (chạy `npm run gen:openapi` nếu đỏ)", () => {
    expect(readFileSync(path.join(ROOT, PLATFORM_OPENAPI_PATH), "utf8")).toBe(serializeOpenApi(buildPlatformOpenApi()))
  })

  it("mỗi method của mỗi route /platform/* có đúng một operation, và ngược lại", () => {
    const fromRoutes = routeFiles(PLATFORM).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/export\s+(?:const|async function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
        (match) => `${(match[1] ?? "").toLowerCase()} ${openApiPath(file)}`
      )
    )
    const fromRegistry = PLATFORM_OPERATIONS.map((op) => `${op.method} ${op.path}`)
    expect([...fromRegistry].sort()).toEqual([...fromRoutes].sort())
    expect(new Set(fromRegistry).size).toBe(fromRegistry.length)
  })

  it("operationId duy nhất; mọi operation khai 401 và 403", () => {
    const ids = PLATFORM_OPERATIONS.map((op) => op.operationId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const op of PLATFORM_OPERATIONS) expect(op.errors, op.operationId).toEqual(expect.arrayContaining([401, 403]))
  })

  it("x-capability khớp cột năng lực của đặc tả 06 mục 21", () => {
    const spec = readFileSync(path.join(ROOT, "docs/dac-ta/06-api-specification.md"), "utf8")
    const specCaps = new Map<string, string>()
    for (const line of spec.split("\n")) {
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      if (!cells[1]?.startsWith("`/platform/")) continue
      const p = cells[1].replace(/`/g, "").replace(/:(\w+)/g, "{$1}")
      for (const m of (cells[0] ?? "").split("·").map((x) => x.trim().toLowerCase())) specCaps.set(`${m} ${p}`, cells[2] ?? "")
    }
    const mismatches: string[] = []
    for (const op of PLATFORM_OPERATIONS) {
      const cap = op.extensions?.["x-capability"]
      if (typeof cap !== "string" || !/^N\d+$/.test(cap)) continue
      // Đặc tả viết tham số đường dẫn chung là `:id` — so theo dạng chuẩn hoá
      const key = `${op.method} ${op.path.replace(/\{\w+\}/g, "{id}")}`
      const col = [...specCaps.entries()].find(([k]) => k.replace(/\{\w+\}/g, "{id}") === key)?.[1]
      if (col === undefined) mismatches.push(`${key}: không có dòng trong đặc tả 06`)
      else if (!new RegExp(`\\b${cap}\\b`).test(col)) mismatches.push(`${key}: x-capability ${cap}, đặc tả ghi "${col}"`)
    }
    expect(mismatches).toEqual([])
  })
})
