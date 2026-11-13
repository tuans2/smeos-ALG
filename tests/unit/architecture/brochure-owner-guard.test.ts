import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * `assertBrochureOwner` là hàm async (kiểm chủ phiên hoặc nhân viên tiệm). Gọi mà thiếu
 * `await` thì route chạy tiếp như người lạ là chủ phiên, còn lỗi 404 thành promise bị bỏ rơi
 * (soát 14/10/2026: 8 route công khai dính). Mọi lời gọi phải có `await`.
 */
const ROOT = path.resolve(__dirname, "../../..")
const PUBLIC_BROCHURE = path.join(ROOT, "src/app/api/v1/public/brochure")

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return name === "route.ts" ? [full] : []
  })
}

describe("route công khai /b/<mã> — gác chủ phiên phải được await", () => {
  it("không có lời gọi assertBrochureOwner nào thiếu await", () => {
    const offenders = routeFiles(PUBLIC_BROCHURE).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => /\bassertBrochureOwner\(/.test(line) && !/\bawait\s+assertBrochureOwner\(/.test(line))
        .map((line) => `${path.relative(ROOT, file)}: ${line.trim()}`)
    )
    expect(offenders).toEqual([])
  })
})
