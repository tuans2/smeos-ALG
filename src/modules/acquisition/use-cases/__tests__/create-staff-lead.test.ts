import { describe, expect, it, vi } from "vitest"

import type { TenantContext } from "@/core/tenancy/tenant-context"
import { createStaffLead, STAFF_LEAD_CONSENT_VERSION } from "../create-staff-lead"

const ctx = { organizationId: "org-1", userId: "u-1", capabilities: new Set<string>() } as unknown as TenantContext
const deps = () => ({
  leads: { createStaff: vi.fn(async () => ({ id: "lead-1" })) },
  customers: { findOrCreateCustomer: vi.fn(async () => "c-1") },
  now: () => new Date("2026-10-31T00:00:00Z"),
})

describe("Sale tự thêm khách tiềm năng", () => {
  it("ghi vào tổ chức của phiên, người phụ trách là người nhập", async () => {
    const d = deps()
    await createStaffLead(ctx, { name: " Lan ", phone: "090 123 4567", reason: "WALK_IN", nextFollowUpAt: "2026-11-01T02:00:00Z" }, d)
    expect(d.customers.findOrCreateCustomer).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-1", customerPhone: "0901234567" }))
    expect(d.leads.createStaff).toHaveBeenCalledWith(ctx, expect.objectContaining({
      name: "Lan", phone: "0901234567", reason: "WALK_IN", assigneeUserId: "u-1", consentVersion: STAFF_LEAD_CONSENT_VERSION,
    }))
  })

  it("từ chối SĐT sai, lý do lạ và hạn gọi lại không hợp lệ", async () => {
    const d = deps()
    await expect(createStaffLead(ctx, { name: "Lan", phone: "123", reason: "X", nextFollowUpAt: "abc" }, d)).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      details: expect.objectContaining({ phone: expect.any(String), reason: expect.any(String), nextFollowUpAt: expect.any(String) }),
    })
    expect(d.leads.createStaff).not.toHaveBeenCalled()
  })
})
