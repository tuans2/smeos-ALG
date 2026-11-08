import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

/**
 * ADR-012 T-6c: ngành của tổ chức nằm ở cột `organizations.industry_key`, không ở `settings.industry`.
 * Mọi chỗ đọc `settings` của tổ chức rồi chuyển đi nơi khác phải chọn kèm cột ngành (`ORG_SETTINGS_SELECT`) và
 * phủ lên settings (`withIndustryKey` / `withOrganizationIndustry`), vì rất nhiều luật phía sau (phí gia công,
 * chính sách cửa hàng, khung giờ giao, thuật ngữ) đọc `settings.industry`.
 *
 * Còn được chọn `settings: true` trơn: chỗ chỉ đọc đúng một khoá không phải ngành, hoặc đọc để ghi lại
 * (phủ ngành vào rồi ghi lại sẽ chép ngành ngược vào JSON). Danh sách chỉ thu hẹp; thêm chỗ mới phải ghi lý do.
 */
const PLAIN_SETTINGS_ALLOWED: Record<string, { count: number; reason: string }> = {
  "src/modules/field-platform/infra/chain-collection-repository.ts": { count: 5, reason: "hồ sơ thu thập / thoả thuận chia sẻ dữ liệu; đọc để ghi lại" },
  "src/modules/coordinator/infra/prisma-dispatch-reminder-repository.ts": { count: 2, reason: "coordinator_reminders; đọc để ghi lại" },
  "src/modules/crm/infra/customer-branch-scope.ts": { count: 1, reason: "cờ branch_scope" },
  "src/modules/platform/infra/platform-query.ts": { count: 1, reason: "yêu cầu chờ duyệt (pending_*)" },
  "src/modules/platform/infra/account-approval-repository.ts": { count: 2, reason: "is_instant_trial / thông tin dùng thử" },
  "src/modules/chain-partnership/infra/prisma-partnership-repository.ts": { count: 1, reason: "địa chỉ cửa hàng đối tác" },
  "src/modules/greeting-card/infra/subcontract-order-repository.ts": { count: 1, reason: "chain_dispatch_policy" },
  "src/modules/greeting-card/infra/share-link-repository.ts": { count: 1, reason: "người phụ trách mặc định" },
  "src/modules/greeting-card/infra/staff-notification-repository.ts": { count: 2, reason: "kênh thông báo được phép; đọc để ghi lại" },
  "src/modules/greeting-card/infra/telegram-linked-chats.ts": { count: 2, reason: "nhóm Telegram đã liên kết" },
  "src/modules/products/infra/product-master-index-repository.ts": { count: 1, reason: "freshness_guarantee_days" },
  "src/modules/catalog-links/infra/catalog-link-repository.ts": { count: 1, reason: "không đọc ngành (Catalog đóng băng, PO 01/11/2026)" },
}

function plainSettingsSelects(): Map<string, number> {
  const out = execFileSync("git", ["grep", "-n", "settings: true", "--", "src/**/*.ts", "src/**/*.tsx"], { encoding: "utf8" })
  const counts = new Map<string, number>()
  for (const line of out.split("\n")) {
    if (!line) continue
    const file = line.slice(0, line.indexOf(":"))
    if (file.startsWith("src/generated/") || /\.test\.tsx?$/.test(file) || file.includes("__tests__")) continue
    if (line.includes("industry_key: true")) continue
    counts.set(file, (counts.get(file) ?? 0) + 1)
  }
  return counts
}

describe("đọc settings của tổ chức kèm cột ngành (ADR-012 T-6c)", () => {
  it("chỉ chỗ có trong danh sách được chọn settings mà không kèm industry_key", () => {
    const found = plainSettingsSelects()
    const unexpected = [...found].filter(([file, n]) => n > (PLAIN_SETTINGS_ALLOWED[file]?.count ?? 0))
    expect(unexpected, "Chọn ORG_SETTINGS_SELECT và phủ ngành bằng withIndustryKey / withOrganizationIndustry").toEqual([])
  })

  it("danh sách không giữ chỗ đã sửa", () => {
    const found = plainSettingsSelects()
    const stale = Object.entries(PLAIN_SETTINGS_ALLOWED).filter(([file, { count }]) => (found.get(file) ?? 0) < count)
    expect(stale.map(([file]) => file)).toEqual([])
  })
})
