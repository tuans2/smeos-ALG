import { beforeEach, describe, expect, it, vi } from "vitest"

const recorded: unknown[] = []
vi.mock("../record-audit-log", () => ({
  recordAuditLog: async (_ctx: unknown, input: unknown) => {
    recorded.push(input)
  },
}))

import type { TenantContext } from "@/core/tenancy"
import { recordDataExport } from "../record-data-export"

const ctx = { organizationId: "org-a", userId: "u", workspaceId: "w", branchId: null, capabilities: new Set() } as TenantContext

beforeEach(() => {
  recorded.length = 0
})

describe("recordDataExport", () => {
  it("ghi bộ dữ liệu và bộ lọc; không ghi giá trị ô tìm kiếm; bỏ bộ lọc rỗng", async () => {
    await recordDataExport(ctx, "crm_customers", { format: "xlsx", tier: undefined, search: "0901234567" })
    expect(recorded).toEqual([
      { action: "data.export", entityType: "crm_customers", entityId: "org-a", after: { format: "xlsx", search: true } },
    ])
  })
})
