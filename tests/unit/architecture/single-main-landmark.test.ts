import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Khung ứng dụng (`app-shell.tsx`) đã có vùng `<main id="noi-dung-chinh">`. Trang và màn chủ trong khung
 * không mở thêm `<main>` — hai vùng chính làm trình đọc màn hình đọc sai bố cục (GD1 Bước 6, `/san-pham`).
 * Trang công khai, trang in, trang đăng nhập nằm ngoài khung nên không thuộc phạm vi kiểm.
 */
const ROOT = path.resolve(__dirname, "../../..")
const SCOPES = ["src/app/(app)", "src/components/dashboard", "src/components/layout"]
const SHELL = "src/components/layout/app-shell.tsx"

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return name === "__tests__" ? [] : walk(full)
    return full.endsWith(".tsx") ? [full] : []
  })
}

describe("một vùng main trong khung ứng dụng", () => {
  it("màn trong khung ứng dụng không tự thêm <main>", () => {
    const offenders = SCOPES.flatMap((scope) => walk(path.join(ROOT, scope)))
      .map((file) => path.relative(ROOT, file))
      .filter((file) => file !== SHELL && /<main[\s>]/.test(readFileSync(path.join(ROOT, file), "utf8")))
    expect(offenders).toEqual([])
  })
})
