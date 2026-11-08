import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * ADR-013 D-I5, D-60: mọi handler Console vào dữ liệu một tổ chức (`platform/organizations/[id]/*`,
 * `platform/orgs-data/[orgId]/*`) phải gọi `recordPlatformAccess` — chủ tổ chức thấy được nhân viên nền tảng đã xem gì.
 */
const ROOT = path.resolve(__dirname, "../../..")
const DIRS = ["src/app/api/v1/platform/organizations/[id]", "src/app/api/v1/platform/orgs-data/[orgId]"].map((d) => path.join(ROOT, d))

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === "route.ts") out.push(full)
  }
  return out
}

describe("Console ghi truy cập dữ liệu tổ chức (D-60)", () => {
  it("mỗi handler trong các route theo tổ chức gọi recordPlatformAccess đúng một lần", () => {
    const files = DIRS.flatMap(routeFiles)
    expect(files.length).toBeGreaterThan(0)
    const wrong = files.flatMap((file) => {
      const source = readFileSync(file, "utf8")
      const handlers = source.match(/export (const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g)?.length ?? 0
      const calls = source.match(/\bawait recordPlatformAccess\(request, pctx\)/g)?.length ?? 0
      return handlers === calls ? [] : [`${path.relative(ROOT, file)}: ${calls}/${handlers}`]
    })
    expect(wrong).toEqual([])
  })
})
