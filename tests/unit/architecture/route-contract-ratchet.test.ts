import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Chuẩn API Contract v1.1 (PO chốt 07/11/2026, audit API đợt 3,
 * `docs/audit/api-architecture-audit/02_API_CONTRACT_STANDARD_AND_OPENAPI.md`):
 *
 * 1. Route MỚI dưới `/api/v1` khai bằng `defineRoute` (`src/core/http/define-route.ts`) — xác thực,
 *    mã năng lực, rate limit, idempotency, lược đồ thân/query nằm ở một khai báo.
 * 2. Không tệp mới nào dưới `src/app/api` trả envelope lệch: `NextResponse.json`, `new Response(JSON.stringify`,
 *    `{ success }`, `{ ok }` ở gốc, `{ error: "chuỗi" }`.
 *
 * Route/tệp cũ nằm trong hai danh sách `.txt` cạnh tệp này; danh sách chỉ được thu hẹp.
 */
const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api")
const V1 = path.join(API, "v1")

const ENVELOPE_PATTERNS: Record<string, RegExp> = {
  "next-response-json": /NextResponse\.json\(/,
  "raw-json-response": /new Response\(JSON\.stringify\(/,
  "success-envelope": /jsonResponse\(\s*\{\s*success\b/,
  "ok-envelope": /jsonResponse\(\s*\{\s*ok\b/,
  "string-error": /(?:jsonResponse|NextResponse\.json)\(\s*\{\s*error:\s*["'`]/,
}

function walk(dir: string, accept: (name: string) => boolean): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full, accept))
    else if (accept(entry)) out.push(full)
  }
  return out
}

function readList(name: string): string[] {
  return readFileSync(path.join(__dirname, name), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

const rel = (file: string) => path.relative(ROOT, file).split(path.sep).join("/")
const routeKey = (file: string) => path.relative(V1, path.dirname(file)).split(path.sep).join("/")

/** Route hoặc handler cục bộ nó import (`./_handlers`) gọi `defineRoute(`. */
function usesDefineRoute(file: string): boolean {
  const source = readFileSync(file, "utf8")
  if (/\bdefineRoute\(/.test(source)) return true
  for (const match of source.matchAll(/from "(\.[^"]+)"/g)) {
    const base = path.resolve(path.dirname(file), match[1] ?? "")
    const target = [`${base}.ts`, path.join(base, "index.ts")].find((candidate) => existsSync(candidate))
    if (target && /\bdefineRoute\(/.test(readFileSync(target, "utf8"))) return true
  }
  return false
}

describe("chuẩn API Contract v1.1 — ratchet", () => {
  const routes = walk(V1, (name) => name === "route.ts")
  const legacyRoutes = new Set(readList("route-contract-legacy.txt"))

  it("route mới dưới /api/v1 khai bằng defineRoute", () => {
    const offenders = routes.filter((file) => !legacyRoutes.has(routeKey(file)) && !usesDefineRoute(file)).map(routeKey)
    expect(offenders).toEqual([])
  })

  it("route-contract-legacy.txt không giữ route đã chuyển sang defineRoute hoặc đã xoá", () => {
    const byKey = new Map(routes.map((file) => [routeKey(file), file]))
    const stale = [...legacyRoutes].filter((key) => {
      const file = byKey.get(key)
      return !file || usesDefineRoute(file)
    })
    expect(stale).toEqual([])
  })

  const sources = walk(API, (name) => name.endsWith(".ts") && !name.includes(".test."))
  const legacyEnvelope = new Set(readList("api-envelope-legacy.txt"))
  const found = new Set(
    sources.flatMap((file) => {
      const source = readFileSync(file, "utf8")
      return Object.entries(ENVELOPE_PATTERNS)
        .filter(([, pattern]) => pattern.test(source))
        .map(([name]) => `${name}\t${rel(file)}`)
    })
  )

  it("không tệp mới nào trả envelope lệch chuẩn", () => {
    expect([...found].filter((entry) => !legacyEnvelope.has(entry))).toEqual([])
  })

  it("api-envelope-legacy.txt không giữ mục đã sửa hoặc đã xoá", () => {
    expect([...legacyEnvelope].filter((entry) => !found.has(entry))).toEqual([])
  })
})
