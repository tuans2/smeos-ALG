import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { PUBLIC, SESSION_ONLY } from "@/app/api/v1/_contracts/internal-op"
import { buildInternalOpenApi, INTERNAL_COVERED_PREFIXES, INTERNAL_OPENAPI_PATH, INTERNAL_OPERATIONS } from "@/app/api/v1/_contracts/internal-openapi"
import { serializeOpenApi } from "@/core/http/openapi"

/**
 * OpenAPI nội bộ của API tiệm (PO 07/11/2026) — gác bằng `npm test`: tệp đã commit khớp bản sinh; trong các nhóm đã
 * phủ (`INTERNAL_COVERED_PREFIXES`) mỗi method của mỗi route có đúng một operation và ngược lại; mã năng lực khớp
 * đặc tả 06.
 */
const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api/v1")

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return entry.startsWith("_") ? [] : routeFiles(full)
    return entry === "route.ts" ? [full] : []
  })
}
const openApiPath = (file: string) => `/${path.relative(API, path.dirname(file)).split(path.sep).join("/")}`.replace(/\[(?:\.\.\.)?(\w+)\]/g, "{$1}") // `[...key]` (bắt mọi đường dẫn) → `{key}`
const normalize = (p: string) => p.replace(/\{\w+\}/g, "{id}")

describe("OpenAPI nội bộ — API tiệm", () => {
  it("tệp đã commit khớp bản sinh từ mã (chạy `npm run gen:openapi` nếu đỏ)", () => {
    expect(readFileSync(path.join(ROOT, INTERNAL_OPENAPI_PATH), "utf8")).toBe(serializeOpenApi(buildInternalOpenApi()))
  })

  it("trong nhóm đã phủ, mỗi method của mỗi route có đúng một operation, và ngược lại", () => {
    const fromRoutes = INTERNAL_COVERED_PREFIXES.flatMap((prefix) => routeFiles(path.join(API, prefix))).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/export\s+(?:const|async function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
        (match) => `${(match[1] ?? "").toLowerCase()} ${openApiPath(file)}`
      )
    )
    const fromRegistry = INTERNAL_OPERATIONS.map((op) => `${op.method} ${op.path}`)
    expect([...fromRegistry].sort()).toEqual([...fromRoutes].sort())
    expect(new Set(fromRegistry).size).toBe(fromRegistry.length)
  })

  it("operationId duy nhất; route của tổ chức khai 401, 403, 409 và lệnh ghi khai 402; route chỉ cần phiên khai 401", () => {
    const ids = INTERNAL_OPERATIONS.map((op) => op.operationId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const op of INTERNAL_OPERATIONS) {
      const cap = op.extensions?.["x-capability"]
      if (cap === PUBLIC) expect(op.security, op.operationId).toEqual([])
      else if (cap === SESSION_ONLY) expect(op.errors, op.operationId).toContain(401)
      else if (op.security.includes("platformSession")) expect(op.errors, op.operationId).toEqual(expect.arrayContaining([401, 403]))
      else expect(op.errors, op.operationId).toEqual(expect.arrayContaining(op.method === "get" ? [401, 403, 409] : [401, 402, 403, 409]))
    }
  })

  it("x-capability khớp cột năng lực của đặc tả 06", () => {
    const spec = readFileSync(path.join(ROOT, "docs/dac-ta/06-api-specification.md"), "utf8")
    const specCaps = new Map<string, string>()
    for (const line of spec.split("\n")) {
      const cells = line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
      if (!/^`\/[a-z]/.test(cells[1] ?? "")) continue
      const p = normalize((cells[1] ?? "").replace(/`/g, "").replace(/:(\w+)/g, "{$1}"))
      const methods = (cells[0] ?? "").split("·").map((x) => x.trim().toLowerCase())
      const caps = (cells[2] ?? "").split(" · ")
      // "GET · PUT | `R1` · `R15`" — ghép theo thứ tự khi số lượng bằng nhau, không thì cả cột
      methods.forEach((m, i) => specCaps.set(`${m} ${p}`, caps.length === methods.length ? (caps[i] ?? "") : (cells[2] ?? "")))
    }
    const mismatches: string[] = []
    for (const op of INTERNAL_OPERATIONS) {
      const codes = String(op.extensions?.["x-capability"] ?? "").match(/\b[A-Z]\d+\b/g) ?? []
      const key = `${op.method} ${normalize(op.path)}`
      const col = specCaps.get(key)
      if (col === undefined) mismatches.push(`${key}: không có dòng trong đặc tả 06`)
      else for (const code of codes) if (!new RegExp(`\\b${code}\\b`).test(col)) mismatches.push(`${key}: x-capability ${code}, đặc tả ghi "${col}"`)
    }
    expect(mismatches).toEqual([])
  })
})
