import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { ACK_ONLY_ROUTES, isAckOnlyRoute } from "@/core/http/ack-routes"
import { notFound } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"

/**
 * PR #172 e2e-ux treo 15 phút: `no-store` mặc định (audit API-17) khiến Chromium không hoàn tất các
 * `fetch` "bắn rồi quên" của trang Thẻ chào (không đọc thân) → trang không bao giờ `networkidle`.
 * Lỗi (≥ 400) và route chỉ xác nhận trong `ACK_ONLY_ROUTES` nhận `no-cache`; phản hồi có dữ liệu giữ
 * `no-store`.
 */
const ROOT = process.cwd()
const at = (path: string) => `http://localhost${path}`
const post = (path: string) => new Request(at(path), { method: "POST" })

describe("route chỉ xác nhận — Cache-Control", () => {
  const ok = handle(async () => jsonResponse({ ok: true }, { status: 202 }))
  const fail = handle(async () => {
    throw notFound()
  })

  it("phản hồi thành công của route xác nhận → no-cache", async () => {
    const res = await ok(post("/api/v1/public/greeting-catalog/abc/event"))
    expect(res.headers.get("cache-control")).toBe("no-cache")
  })

  it("phản hồi lỗi của route xác nhận cũng → no-cache (client không đọc thân lỗi)", async () => {
    const res = await fail(post("/api/v1/public/brochure/T01-ABC/claim"))
    expect(res.status).toBe(404)
    expect(res.headers.get("cache-control")).toBe("no-cache")
  })

  it("lỗi ở route thường — ném ra hay trả về — cũng → no-cache (client chỉ xem res.ok)", async () => {
    const thrown = await fail(new Request(at("/api/v1/public/subcontract/KHONGTONTAI")))
    expect(thrown.headers.get("cache-control")).toBe("no-cache")
    const returned = handle(async () => jsonResponse({ error: { code: "NOT_FOUND", message: "x" } }, { status: 404 }))
    expect((await returned(new Request(at("/api/v1/integrations/governance")))).headers.get("cache-control")).toBe("no-cache")
  })

  it("phản hồi thành công có dữ liệu giữ no-store mặc định", async () => {
    expect((await ok(post("/api/v1/public/brochure/T01-ABC/select"))).headers.get("cache-control")).toBe("no-store")
    expect((await ok(new Request(at("/api/v1/public/greeting-catalog/abc/event")))).headers.get("cache-control")).toBe("no-store")
  })

  it("route tự đặt cache-control thì giữ nguyên", async () => {
    const own = handle(async () => jsonResponse({ ok: true }, { headers: { "cache-control": "private, max-age=60" } }))
    expect((await own(post("/api/v1/public/brochure/T01-ABC/event"))).headers.get("cache-control")).toBe("private, max-age=60")
  })

  it("mọi route trong danh sách có tệp route thật", () => {
    for (const route of ACK_ONLY_ROUTES) {
      expect(existsSync(join(ROOT, "src/app", route.path, "route.ts")), route.path).toBe(true)
    }
  })
})

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full)
    return /\.(ts|tsx)$/.test(name) ? [full] : []
  })
}

describe("fetch keepalive phía khách chỉ trỏ tới route xác nhận", () => {
  it("mọi `keepalive: true` gọi một route trong ACK_ONLY_ROUTES", () => {
    const offenders: string[] = []
    let seen = 0
    for (const file of sourceFiles(join(ROOT, "src/components"))) {
      const text = readFileSync(file, "utf8")
      if (!text.includes("keepalive: true")) continue
      for (const match of text.matchAll(/fetch\(\s*`([^`]+)`/g)) {
        const url = match[1]!.replace(/\$\{[^}]+\}/g, "X")
        seen++
        if (!isAckOnlyRoute("POST", url)) offenders.push(`${file.replace(ROOT + "/", "")}: ${match[1]}`)
      }
    }
    expect(seen).toBeGreaterThan(0)
    expect(offenders).toEqual([])
  })
})
