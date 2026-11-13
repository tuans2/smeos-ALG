import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { LEAD_STATUSES } from "@/modules/acquisition/domain/lead-rules"
import type { ContentGenerationStatus } from "@/modules/content-engine/domain/repositories/content-generation-repository.interface"
import { CAMPAIGN_PACKAGE_STATUSES } from "@/modules/creative-production/domain/campaign-package-rules"
import type { GreetingSessionStatus } from "@/modules/greeting-card/domain/greeting-card-types"
import type { PaymentEventStatus } from "@/modules/greeting-card/infra/greeting-integration-repository"
import type { BrandLibraryStatus } from "@/modules/profiles/domain/brand-library"
import type { UsageStatus } from "@/modules/usage/domain/repositories/usage-repository.interface"

/**
 * CHECK trên cột `status` (migration 20261105200000) phải khớp tập giá trị trong mã.
 * Thêm một trạng thái mới vào mã mà quên migration là Postgres từ chối ghi — test này
 * đỏ trước khi điều đó lên production.
 *
 * Kiểu union không có giá trị lúc chạy, nên liệt kê bằng `Record<Union, true>`: thiếu
 * hay thừa một khoá là `tsc` báo lỗi.
 */
const usage: Record<UsageStatus, true> = { ENQUEUED: true, COMPLETED: true, REFUNDED: true, PARTIAL_REFUND: true }
const contentGenerations: Record<ContentGenerationStatus, true> = { DRAFT: true, APPROVED: true, SCHEDULED: true }
const greetingSessions: Record<GreetingSessionStatus, true> = {
  CREATED: true, OPENED: true, BROWSING: true, SELECTED: true,
  ORDER_SUBMITTED: true, PAYMENT_REPORTED: true, COMPLETED: true,
}
const paymentEvents: Record<PaymentEventStatus, true> = { RECEIVED: true, MATCHED: true, UNMATCHED: true, IGNORED: true }
const brandLibrary: Record<BrandLibraryStatus, true> = { ACTIVE: true, ARCHIVED: true }

const EXPECTED: Record<string, readonly string[]> = {
  usage_status_check: Object.keys(usage),
  leads_status_check: LEAD_STATUSES,
  campaign_packages_status_check: CAMPAIGN_PACKAGE_STATUSES,
  content_generations_status_check: Object.keys(contentGenerations),
  greeting_sessions_status_check: Object.keys(greetingSessions),
  greeting_payment_events_status_check: Object.keys(paymentEvents),
  brand_library_items_status_check: Object.keys(brandLibrary),
}

function constraintsInMigrations(): Map<string, string[]> {
  const sql = readFileSync(
    join(process.cwd(), "prisma/migrations/20261105200000_status_check_constraints/migration.sql"),
    "utf8"
  )
  const found = new Map<string, string[]>()
  for (const m of sql.matchAll(/ADD CONSTRAINT "(\w+)" CHECK \("status" IN \(([^)]*)\)\)/g)) {
    const name = m[1] ?? ""
    const values = (m[2] ?? "").split(",").map((v) => v.trim().replace(/^'|'$/g, ""))
    found.set(name, values)
  }
  return found
}

/** Ràng buộc của bảng đã xoá ở migration contract sau đó — không còn trong CSDL. */
const DROPPED_WITH_TABLE = new Set(["chain_partnerships_status_check"]) // ADR-012 T-3b (trạng thái nay là enum ở organization_links)

describe("CHECK status khớp tập giá trị trong mã", () => {
  const found = constraintsInMigrations()
  for (const name of DROPPED_WITH_TABLE) found.delete(name)

  it("đủ 7 ràng buộc", () => {
    expect([...found.keys()].sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  for (const [name, values] of Object.entries(EXPECTED)) {
    it(name, () => {
      expect([...(found.get(name) ?? [])].sort()).toEqual([...values].sort())
    })
  }
})
