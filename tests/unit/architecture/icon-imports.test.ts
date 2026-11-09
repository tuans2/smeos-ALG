import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * Import icon trực tiếp từ `@/components/ui/icon-set/<ten>`, không qua barrel `@/components/ui/icons`.
 * Turbopack không lược re-export không dùng của barrel nội bộ: một chỗ import barrel kéo cả ~240 icon
 * (6 nét vẽ mỗi icon) vào chunk của trang. Còn được dùng barrel: tệp Thẻ chào và Catalog cũ ghi trong
 * `icon-barrel-legacy.txt` (PO gỡ đóng băng Thẻ chào 05/11/2026, Catalog 09/11/2026; danh sách chỉ thu
 * hẹp) và các tệp > 350 dòng đổi import sẽ dài thêm (đổi khi tách tệp).
 */
const LARGE_FILES_PENDING_SPLIT = [
  "src/app/(app)/creative-studio/page.tsx",
  "src/app/(app)/lich-dang/page.tsx",
  "src/app/(app)/san-pham/[id]/tinh-nang/product-copy/[copyId]/page.tsx",
  "src/app/(app)/tai-anh/page.tsx",
  "src/components/crm/customer-detail-modal.tsx",
  "src/components/market-intelligence/product-confirmation-card.tsx",
  "src/components/market-intelligence/product-intelligence-workspace.tsx",
  "src/components/market-intelligence/product-topics-list.tsx",
  "src/components/market-intelligence/product-upload-card.tsx",
  "src/components/products/bulk-import/branch-import-panel.tsx",
  "src/components/profiles/brand-profile-form.tsx",
  "src/components/upload/upload-wizard.tsx",
]

function frozenPaths(): Set<string> {
  const dir = join(process.cwd(), "tests/unit/architecture")
  const paths = new Set<string>()
  for (const name of ["icon-barrel-legacy.txt"]) {
    for (const line of readFileSync(join(dir, name), "utf8").split("\n")) {
      if (line.startsWith("#")) continue
      const path = line.trim().split(/\s+/).pop()
      if (path) paths.add(path)
    }
  }
  return paths
}

describe("Icon: import trực tiếp từng icon, không qua barrel", () => {
  it("chỉ tệp vùng khoá và tệp lớn đang chờ tách còn import `@/components/ui/icons`", () => {
    const out = execFileSync("git", ["grep", "-l", 'from "@/components/ui/icons"', "--", "src"], { cwd: process.cwd() })
      .toString()
      .split("\n")
      .filter(Boolean)
      .filter((p) => p !== "src/components/ui/icons.tsx" && !p.startsWith("src/components/ui/icon-set/"))
    const frozen = frozenPaths()
    const allowed = new Set(LARGE_FILES_PENDING_SPLIT)
    expect(out.filter((p) => !frozen.has(p) && !allowed.has(p))).toEqual([])
  })
})
