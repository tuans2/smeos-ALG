import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { getAllNotificationEvents } from "./events"

// Link trong thông báo phải mở được trang thật (AUD-041: hơn 30 template từng trỏ tới trang không có)
const APP = join(process.cwd(), "src/app")
const GROUPS = readdirSync(APP).filter((d) => d.startsWith("("))

function pageExists(template: string): boolean {
  const parts = template.split("/").filter(Boolean).map((p) => (/^\{\w+\}$/.test(p) ? "[id]" : p))
  return GROUPS.some((g) => existsSync(join(APP, g, ...parts, "page.tsx")))
}

describe("deepLinkTemplate của sự kiện thông báo", () => {
  it("đều trỏ tới trang có thật", () => {
    const broken = getAllNotificationEvents()
      .filter((e) => e.deepLinkTemplate && !pageExists(e.deepLinkTemplate))
      .map((e) => `${e.key} → ${e.deepLinkTemplate}`)
    expect(broken).toEqual([])
  })
})
