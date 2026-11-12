import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Luật 3 đặc tả 06: mọi endpoint kiểm quyền bằng mã năng lực. Luật chỉ nằm
 * trên giấy thì trôi — soát 05/10/2026 thấy 18 route chỉ gọi
 * `requireTenantContext` (nợ #170). Phép quét này chặn route MỚI thiếu gác;
 * route cũ thiếu gác nằm trong NO_CAPABILITY_GUARD kèm lý do, và danh sách
 * chỉ được co lại (mục nào đã có gác mà vẫn nằm đây thì test đỏ).
 */

const ROOT = path.resolve(__dirname, "../../..")
const API = path.join(ROOT, "src/app/api/v1")

/**
 * Lời gọi được tính là gác quyền. `defineRoute(` (07/11/2026) khai `auth` bắt buộc theo kiểu: mã năng
 * lực, hoặc `capability: null` / `kind: "custom"` kèm `reason` — khai báo đó thay cho một mục
 * NO_CAPABILITY_GUARD, và `src/core/http/define-route.ts` thực thi nó.
 */
const GUARD =
  /\b(requireCapability|hasCapability|requireExecutiveRole|requirePlatformCapability|requirePlatformContext|requireIntegrationContext|requireIntegrationClient)\(|\bdefineRoute(<[^\n]*?>)?\(|\bcapabilities\.has\(/


/** Route không gọi gác quyền nào — có chủ đích hoặc đang là nợ. */
const NO_CAPABILITY_GUARD: Record<string, string> = {
  "internal/chain-dispatch-sweep": "cron nội bộ, không có phiên — gác bằng CRON_SECRET (isAuthorizedCronRequest)",
  // Có chủ đích: chưa có phiên/tổ chức, hoặc gác bằng cơ chế khác.
  "chat/webhooks/facebook": "webhook nhà cung cấp — xác thực bằng chữ ký",
  "chat/webhooks/zalo": "webhook nhà cung cấp — xác thực bằng chữ ký",
  "chat/public/widget": "khung chat AI trên trang công khai do công cụ SMEOS tạo — tổ chức suy từ slug, giới hạn tần suất (đặc tả 06 mục 17)",
  // Thông báo của CHÍNH người dùng — truy vấn luôn lọc theo user + tổ chức của phiên.
}

function routeFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...routeFiles(full))
    else if (entry === "route.ts") out.push(full)
  }
  return out
}

function resolveImport(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2))
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec)
  else return null
  for (const candidate of [`${base}.ts`, path.join(base, "index.ts")]) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Gác nằm ở route, ở handler cục bộ nó re-export, hoặc ở use-case nó gọi
 * (sâu tối đa 2 bước). Bỏ qua `infra/` và `resolve-session` — tệp phiên nhắc
 * tới `capabilities` nhưng không gác năng lực nào cho route.
 */
function isGuarded(file: string, depth: number, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false
  seen.add(file)
  const source = readFileSync(file, "utf8")
  if (GUARD.test(source)) return true
  if (depth === 0) return false
  for (const match of source.matchAll(/from "([^"]+)"/g)) {
    const spec = match[1] ?? ""
    const local = spec.startsWith(".")
    if (!local && !spec.startsWith("@/modules/")) continue
    if (spec.includes("/infra/") || spec.includes("resolve-session")) continue
    const target = resolveImport(file, spec)
    if (target && isGuarded(target, local ? depth : depth - 1, seen)) return true
  }
  return false
}

const key = (file: string) => path.relative(API, path.dirname(file)).split(path.sep).join("/")

const routes = routeFiles(API).filter((file) => !key(file).startsWith("public/"))

describe("route /api/v1 gác bằng mã năng lực (đặc tả 06 luật 3)", () => {
  it("route mới không gọi gác quyền phải được ghi vào NO_CAPABILITY_GUARD kèm lý do", () => {
    const unguarded = routes
      .filter((file) => !isGuarded(file, 2))
      .map(key)
      .filter((k) => !(k in NO_CAPABILITY_GUARD))
    expect(unguarded).toEqual([])
  })

  it("NO_CAPABILITY_GUARD không giữ mục đã có gác hoặc đã bị xoá", () => {
    const byKey = new Map(routes.map((file) => [key(file), file]))
    const stale = Object.keys(NO_CAPABILITY_GUARD).filter((k) => {
      const file = byKey.get(k)
      return !file || isGuarded(file, 2)
    })
    expect(stale).toEqual([])
  })
})
