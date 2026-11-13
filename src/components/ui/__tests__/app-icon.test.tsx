import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { getAllTools } from "@/modules/toolkit/domain/toolkit-catalog"
import { getAllBusinessModules } from "@/modules/toolkit/domain/business-modules"
import { getStoreOperationsSection } from "@/modules/toolkit/domain/store-operations"
import { IconTile, hasAppIcon } from "../app-icon"

describe("AppIcon / IconTile", () => {
  it("mọi icon trong danh mục công cụ, 6 module và khu vận hành đều có icon Phosphor", () => {
    const names = [
      ...getAllTools().map((t) => t.icon),
      ...getAllBusinessModules().map((m) => m.icon),
      ...getStoreOperationsSection(true).groups.map((g) => g.icon),
    ]
    expect(names.filter((n) => !hasAppIcon(n))).toEqual([])
  })

  it("ô đặc dùng icon trắng, ô nhạt dùng màu nhóm; icon trang trí ẩn khỏi trình đọc màn hình", () => {
    const solid = renderToStaticMarkup(<IconTile name="Camera" tone="blue" variant="solid" />)
    expect(solid).toContain("text-surface")
    expect(solid).toContain('aria-hidden="true"')
    const soft = renderToStaticMarkup(<IconTile name="Camera" tone="blue" />)
    expect(soft).toContain("text-tone-blue")
  })

  it("không tra icon động qua namespace `./icons` (giữ chunk icon của shell nhỏ)", () => {
    // `import * as X from "./icons"` + `X[name]` buộc bundler giữ mọi icon trong chunk chung của mọi trang.
    const src = readFileSync(join(process.cwd(), "src/components/ui/app-icon.tsx"), "utf8")
    expect(src).not.toMatch(/import \* as \w+ from "\.\/icons"/)
  })
})
