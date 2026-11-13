import { beforeEach, describe, expect, it, vi } from "vitest"

const findById = vi.fn()
const removeMembership = vi.fn()
const recordAuditLog = vi.fn()

vi.mock("@/modules/organization/infra/membership-repository", () => ({
  MembershipRepository: class { findById = findById },
  getMembershipRepository: () => ({ findById }),
}))
vi.mock("@/modules/organization/infra/staff-account-repository", () => ({
  StaffAccountRepository: class { removeMembership = removeMembership },
  getStaffAccountRepository: () => ({ removeMembership }),
}))
vi.mock("@/modules/audit/use-cases/record-audit-log", () => ({ recordAuditLog }))

const { removeMember } = await import("@/modules/organization/use-cases/remove-member")

const ctx = { organizationId: "org-1", userId: "owner-1" } as never

describe("removeMember", () => {
  beforeEach(() => vi.clearAllMocks())

  it("xoá nhân viên, thu hồi phiên và ghi nhật ký", async () => {
    findById.mockResolvedValue({ id: "m-2", user_id: "user-2", status: "ACTIVE" })
    removeMembership.mockResolvedValue(true)
    await removeMember(ctx, "m-2")
    expect(removeMembership).toHaveBeenCalledWith(ctx, "m-2", "user-2")
    expect(recordAuditLog).toHaveBeenCalledWith(ctx, expect.objectContaining({ action: "member.remove", entityId: "m-2" }))
  })

  it("không cho tự xoá chính mình", async () => {
    findById.mockResolvedValue({ id: "m-1", user_id: "owner-1", status: "ACTIVE" })
    await expect(removeMember(ctx, "m-1")).rejects.toMatchObject({ status: 422 })
    expect(removeMembership).not.toHaveBeenCalled()
  })

  it("thành viên tiệm khác → 404", async () => {
    findById.mockResolvedValue(null)
    await expect(removeMember(ctx, "m-x")).rejects.toMatchObject({ status: 404 })
    expect(removeMembership).not.toHaveBeenCalled()
  })
})
