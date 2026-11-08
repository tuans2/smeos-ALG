import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { buildPublicOpenApi, PUBLIC_OPENAPI_PATH, PUBLIC_OPERATIONS } from "@/app/api/v1/public/_contracts/public-openapi"
import { serializeOpenApi } from "@/core/http/openapi"

/**
 * OpenAPI của bề mặt công khai `/public/*` (audit API đợt 6, PO 07/11/2026) — gác bằng `npm test`:
 * tệp đã commit khớp bản sinh; mỗi method của mỗi route có đúng một operation và ngược lại.
 */
const ROOT = path.resolve(__dirname, "../../..")

/** Route công khai CHƯA giới hạn tần suất — chỉ được co lại (audit API-09). */
const NO_RATE_LIMIT: Record<string, string> = {}
const PUBLIC = path.join(ROOT, "src/app/api/v1/public")

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return entry.startsWith("_") ? [] : routeFiles(full)
    return entry === "route.ts" ? [full] : []
  })
}

const openApiPath = (file: string) =>
  `/public/${path.relative(PUBLIC, path.dirname(file)).split(path.sep).join("/")}`.replace(/\[(\w+)\]/g, "{$1}")

describe("OpenAPI — bề mặt công khai", () => {
  it("tệp đã commit khớp bản sinh từ mã (chạy `npm run gen:openapi` nếu đỏ)", () => {
    expect(readFileSync(path.join(ROOT, PUBLIC_OPENAPI_PATH), "utf8")).toBe(serializeOpenApi(buildPublicOpenApi()))
  })

  it("mỗi method của mỗi route /public/* có đúng một operation, và ngược lại", () => {
    const fromRoutes = routeFiles(PUBLIC).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/export\s+(?:const|async function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
        (match) => `${(match[1] ?? "").toLowerCase()} ${openApiPath(file)}`
      )
    )
    const fromRegistry = PUBLIC_OPERATIONS.map((op) => `${op.method} ${op.path}`)
    expect([...fromRegistry].sort()).toEqual([...fromRoutes].sort())
    expect(new Set(fromRegistry).size).toBe(fromRegistry.length)
  })

  it("operationId duy nhất; mọi operation khai 429, trừ route đã biết là chưa giới hạn tần suất", () => {
    const ids = PUBLIC_OPERATIONS.map((op) => op.operationId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const op of PUBLIC_OPERATIONS) {
      if (op.operationId in NO_RATE_LIMIT) expect(op.errors, op.operationId).not.toContain(429)
      else expect(op.errors, op.operationId).toContain(429)
    }
  })

  it("NO_RATE_LIMIT khớp mã: route trong danh sách thật sự chưa gọi enforceRateLimit", () => {
    for (const id of Object.keys(NO_RATE_LIMIT)) {
      const op = PUBLIC_OPERATIONS.find((o) => o.operationId === id)
      expect(op, id).toBeDefined()
      const file = path.join(ROOT, "src/app/api/v1", op!.path.replace(/\{(\w+)\}/g, "[$1]"), "route.ts")
      expect(readFileSync(file, "utf8"), id).not.toContain("enforceRateLimit")
    }
  })
})
