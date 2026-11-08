import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { serializeOpenApi } from "@/core/http/openapi"
import {
  buildIntegrationOpenApi,
  INTEGRATION_OPENAPI_PATH,
  INTEGRATION_OPERATIONS,
} from "@/modules/integration/contracts/integration-openapi"

/**
 * OpenAPI của Integration API (audit API đợt 4, PO 07/11/2026). Gác bằng `npm test` thay cho một bước CI
 * riêng (PO chọn, không sửa `ci.yml`):
 * 1. Tệp đã commit đúng bằng bản sinh từ lược đồ zod — sửa zod mà quên `npm run gen:openapi` là đỏ.
 * 2. Mỗi method của mỗi route `/api/v1/integration/*` có đúng một operation, và ngược lại.
 * 3. Route ngoài vùng Catalog đóng băng không tự khai lược đồ thân — dùng chung `contracts/http-requests.ts`.
 */
const ROOT = path.resolve(__dirname, "../../..")
const INTEGRATION = path.join(ROOT, "src/app/api/v1/integration")
const FROZEN_PREFIX = "catalog-links"

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return entry === "route.ts" ? [full] : []
  })
}

const routeDir = (file: string) => path.relative(INTEGRATION, path.dirname(file)).split(path.sep).join("/")
const openApiPath = (dir: string) => `/integration/${dir}`.replace(/\[(\w+)\]/g, "{$1}")

describe("OpenAPI — Integration API", () => {
  it("tệp đã commit khớp bản sinh từ mã (chạy `npm run gen:openapi` nếu đỏ)", () => {
    const committed = readFileSync(path.join(ROOT, INTEGRATION_OPENAPI_PATH), "utf8")
    expect(committed).toBe(serializeOpenApi(buildIntegrationOpenApi()))
  })

  it("mỗi method của mỗi route /integration/* có đúng một operation, và ngược lại", () => {
    const fromRoutes = routeFiles(INTEGRATION).flatMap((file) => {
      const source = readFileSync(file, "utf8")
      return [...source.matchAll(/export\s+(?:const|async function)\s+(GET|POST|PUT|PATCH|DELETE)\b/g)].map(
        (match) => `${(match[1] ?? "").toLowerCase()} ${openApiPath(routeDir(file))}`
      )
    })
    const fromRegistry = INTEGRATION_OPERATIONS.map((op) => `${op.method} ${op.path}`)
    expect([...fromRegistry].sort()).toEqual([...fromRoutes].sort())
    expect(new Set(fromRegistry).size).toBe(fromRegistry.length)
  })

  it("operationId duy nhất; operation nào cũng khai 401 và 429", () => {
    const ids = INTEGRATION_OPERATIONS.map((op) => op.operationId)
    expect(new Set(ids).size).toBe(ids.length)
    for (const op of INTEGRATION_OPERATIONS) {
      expect(op.errors, op.operationId).toEqual(expect.arrayContaining([401, 429]))
      if (op.body || op.query) expect(op.errors, op.operationId).toContain(400)
      // Thân JSON qua `handle()` có trần 2 MB (audit API-17)
      if (op.body) expect(op.errors, op.operationId).toContain(413)
    }
  })

  it("route ngoài vùng Catalog đóng băng dùng lược đồ thân chung, không tự khai", () => {
    const offenders = routeFiles(INTEGRATION)
      .filter((file) => !routeDir(file).startsWith(FROZEN_PREFIX))
      .filter((file) => {
        const source = readFileSync(file, "utf8")
        return /\bz\.object\(/.test(source) || (/\.safeParse\(/.test(source) && !source.includes("@/modules/integration/contracts/http-requests"))
      })
      .map(routeDir)
    expect(offenders).toEqual([])
  })
})
