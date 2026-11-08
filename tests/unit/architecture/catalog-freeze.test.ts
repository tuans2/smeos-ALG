import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"

import { describe, expect, it } from "vitest"

import { CAPABILITIES } from "@/core/rbac/capability-catalog"

/**
 * Khoá Catalog (PO 01/11/2026 — `03_KE_HOACH_TRIEN_KHAI.md` §2):
 * Catalog đang hoạt động ổn định, tuyệt đối không sửa đổi mã của công cụ Catalog
 * trong quá trình triển khai Marketing & Sales Center.
 *
 * Chỉ thêm test khoá và băm toàn bộ tệp trong vùng cấm Catalog.
 *
 * Khi có thay đổi được PO duyệt trước:
 *   UPDATE_CATALOG_FREEZE=1 npm test -- tests/unit/architecture/catalog-freeze.test.ts
 *
 * Lần cập nhật mốc đã duyệt:
 * - PO 03/11/2026 (REMEDIATION_ENTERPRISE_UI P1-2): đổi token ngữ nghĩa ở 11 tệp; trang công khai
 *   /c/[slug] giữ <h1>, màn quản trị và trang dựng ấn phẩm dùng <h2>.
 * - PO 03/11/2026 (REMEDIATION_ENTERPRISE_UI P3-10, phương án b): đầu trang /catalog dùng PageHeader chuẩn
 *   (tiêu đề <h1>).
 * - PO 04/11/2026: nút trang khách /c/[slug] (thẻ sản phẩm, thanh đáy, header, chi tiết mẫu, bản xem trước
 *   landing) theo cài đặt Đặt hàng / Liên hệ của Điều hành (Đơn hàng đa nguồn §3.2); gỡ cam kết in cứng
 *   trong chi tiết mẫu.
 * - PO 05/11/2026: nâng giao diện Catalog theo ADR-011 (chỉ giao diện) — điều khiển thô → thành phần
 *   chuẩn, overlay → Dialog, cỡ chữ → thang hệ thống.
 * - PO 05/11/2026: đặt hàng trên catalog/landing công khai dừng khi gói dịch vụ của cửa hàng quá hạn thanh toán
 *   (`place-public-catalog-order.ts` gọi `assertAcceptingPublicOrders`).
 * - PO 06/11/2026: `catalog-link-widgets.tsx` báo lỗi tạo catalog bằng `useToast()` thay `alert()` của
 *   trình duyệt (lint R13) — chỉ đổi cách hiển thị lỗi, không đổi luồng.
 * - PO 07/11/2026 (kế hoạch logic nghiệp vụ, Q11): đặt hàng công khai không nhận ngày giao đã qua
 *   (`place-public-catalog-order.ts` gọi `isPastVnDate`).
 * - PO 07/11/2026 (sửa phát hiện CodeQL `js/incomplete-url-substring-sanitization`): `flower-image-fallback.ts`
 *   so tên miền Google Drive bằng `urlHostIs` thay cho `includes`.
 * - PO 07/11/2026 (audit API-09, API đợt 4): `GET /public/catalog/[slug]` giới hạn 60 lần/phút/IP;
 *   `GET /integration/catalog-links?include_revoked=` đọc bằng `z.stringbool()` (trước đó "false" thành true).
 * - PO 08/11/2026 (mục Thương hiệu bước 3): Landing page chính thức của cửa hàng dùng trang khách /c/[slug] —
 *   link có `filters.store_official` thêm khối "Thông tin cửa hàng" (`landing-template-store-info.tsx`,
 *   `official-store-info.ts`) và đọc sống ảnh, video, sản phẩm chủ đạo từ Hồ sơ cửa hàng. Link khác không đổi.
 */
const ROOT = path.resolve(__dirname, "../../..")
const MANIFEST = path.join(__dirname, "catalog-freeze.manifest.txt")

export const FROZEN_CATALOG_ROOTS = [
  "src/modules/catalog-links",
  "src/modules/catalog-studio",
  "src/components/catalog",
  "src/components/templates/catalog",
  "src/app/(app)/catalog",
  "src/app/c",
  "src/app/api/v1/catalog-links",
  "src/app/api/v1/public/catalog",
  "src/app/api/v1/integration/catalog-links",
  "src/app/api/v1/content-engine/catalog-generate",
  "src/modules/content-engine/domain/prompts/catalog",
  "src/modules/orders/use-cases/place-public-catalog-order.ts",
] as const

const CATALOG_CAPABILITY_CODES = ["J1", "J2", "J7"] as const

function listFiles(targetPath: string): string[] {
  const stat = statSync(targetPath)
  if (!stat.isDirectory()) return [targetPath]
  return readdirSync(targetPath)
    .sort()
    .flatMap((name) => {
      const full = path.join(targetPath, name)
      return statSync(full).isDirectory() ? listFiles(full) : [full]
    })
}

function sha(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex")
}

function currentEntries(): Map<string, string> {
  const out = new Map<string, string>()
  for (const root of FROZEN_CATALOG_ROOTS) {
    const abs = path.join(ROOT, root)
    if (!existsSync(abs)) continue
    for (const file of listFiles(abs)) {
      out.set(path.relative(ROOT, file).split(path.sep).join("/"), sha(readFileSync(file, "utf8")))
    }
  }
  for (const code of CATALOG_CAPABILITY_CODES) {
    const def = CAPABILITIES[code]
    out.set(`capability:${code}`, sha(JSON.stringify({ name: def?.name, defaultRoles: def?.defaultRoles, hardCap: def?.hardCap ?? null })))
  }
  return out
}

function readManifest(): Map<string, string> {
  const out = new Map<string, string>()
  if (!existsSync(MANIFEST)) return out
  for (const line of readFileSync(MANIFEST, "utf8").split("\n")) {
    const m = line.match(/^([0-9a-f]{64}) {2}(.+)$/)
    if (m?.[1] && m[2]) out.set(m[2], m[1])
  }
  return out
}

describe("Catalog đóng băng (PO 01/11/2026)", () => {
  it("mọi tệp và quyền Catalog khớp mốc đã duyệt", () => {
    const current = currentEntries()
    if (process.env.UPDATE_CATALOG_FREEZE === "1") {
      const body = [...current].map(([k, v]) => `${v}  ${k}`).join("\n")
      writeFileSync(MANIFEST, `${body}\n`)
    }
    const baseline = readManifest()
    expect(baseline.size, "thiếu tệp mốc catalog-freeze.manifest.txt").toBeGreaterThan(0)

    const changed = [...current].filter(([k, v]) => baseline.has(k) && baseline.get(k) !== v).map(([k]) => `đã sửa: ${k}`)
    const added = [...current.keys()].filter((k) => !baseline.has(k)).map((k) => `thêm mới: ${k}`)
    const removed = [...baseline.keys()].filter((k) => !current.has(k)).map((k) => `đã xoá: ${k}`)
    expect([...changed, ...added, ...removed], "Catalog bị thay đổi — cần PO duyệt trước (xem đầu tệp test)").toEqual([])
  })
})
