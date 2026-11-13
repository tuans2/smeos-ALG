import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Cổng nhận đơn duy nhất (`docs/kien-truc/KIEN_TRUC_SSOT_DON_HANG_DA_NGUON.md` §4): nguồn mới chỉ tạo đơn qua
 * `ingestOrder`. Ghi thẳng `orders.create` chỉ được phép ở các nơi liệt kê dưới đây, kèm lý do.
 */
const ROOT = path.resolve(__dirname, "../../..")
const SRC = path.join(ROOT, "src")

const ALLOWED_ORDER_WRITERS: Record<string, string> = {
  "src/modules/orders/infra/order-repository.ts": "tầng ghi của cổng nhận đơn chung",
  "src/modules/greeting-card/infra/brochure-checkout-repository.ts": "Thẻ chào — đóng băng (B1)",
  "src/modules/coordinator/infra/coordinator-query-helper.ts": "Tháp điều phối tạo đơn kèm điều phối — chuyển sang cổng chung ở P3",
}

/** `createOrder` chỉ được gọi qua `ingestOrder` (cổng kiểm nguồn + sale phụ trách). */
const ALLOWED_CREATE_ORDER_IMPORTERS = new Set(["src/modules/orders/use-cases/ingest-order.ts"])

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === "generated" || name === "__tests__" ? [] : sourceFiles(full)
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : []
  })
}

const files = sourceFiles(SRC).map((f) => ({ rel: path.relative(ROOT, f).split(path.sep).join("/"), text: readFileSync(f, "utf8") }))

describe("cổng nhận đơn chung", () => {
  it("không nơi nào ngoài danh sách cho phép ghi thẳng orders.create", () => {
    const offenders = files.filter((f) => /\.orders\.create\(/.test(f.text) && !(f.rel in ALLOWED_ORDER_WRITERS)).map((f) => f.rel)
    expect(offenders).toEqual([])
  })

  it("không nơi nào gọi thẳng createOrder — đi qua ingestOrder", () => {
    const offenders = files
      .filter((f) => /from\s+["']@\/modules\/orders\/use-cases\/create-order["']|from\s+["']\.\/create-order["']/.test(f.text))
      .filter((f) => !ALLOWED_CREATE_ORDER_IMPORTERS.has(f.rel))
      .map((f) => f.rel)
    expect(offenders).toEqual([])
  })
})
