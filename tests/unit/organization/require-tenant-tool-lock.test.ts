import { beforeEach, describe, expect, it, vi } from "vitest"

const findById = vi.fn()
vi.mock("@/modules/organization/infra/organization-repository", () => ({
  OrganizationRepository: class { findById = findById },
}))
vi.mock("@/modules/organization/infra/session-repository", () => ({
  SessionRepository: class {
    findByTokenHash = async () => ({ user_id: "u1", organization_id: "org1", expires_at: new Date(Date.now() + 1e6), revoked_at: null })
    wasSupersededByNewLogin = async () => false
  },
}))
vi.mock("@/modules/organization/domain/session-policy", () => ({ isUsable: () => true }))
vi.mock("@/modules/organization/infra/user-repository", () => ({
  UserRepository: class { findById = async () => ({ id: "u1", approval_status: "APPROVED" }) },
}))
vi.mock("@/modules/organization/domain/account-approval", () => ({ canSignIn: () => true }))
vi.mock("@/modules/organization/infra/membership-repository", () => ({
  MembershipRepository: class { findForUserInOrganization = async () => ({ status: "ACTIVE", role_id: "r1", branch_id: null }) },
}))
vi.mock("@/modules/organization/infra/workspace-repository", () => ({
  WorkspaceRepository: class { findDefaultForSessionOrganization = async () => ({ id: "w1" }) },
}))
vi.mock("@/modules/organization/infra/role-repository", () => ({
  RoleRepository: class { findAssignableByIdForOrganization = async () => ({ id: "r1", key: "dieu_hanh" }) },
}))
vi.mock("@/modules/organization/infra/capability-repository", () => ({
  CapabilityRepository: class { resolveGrants = async () => [{ code: "I1" }] },
}))

import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"

const req = (path: string) => new Request(`http://localhost${path}`, { headers: { cookie: "smeos_session=t" } })

describe("requireTenantContext — công cụ bị cấp trên khoá", () => {
  beforeEach(() => findById.mockReset())

  it("chặn API riêng của công cụ không có trong danh sách mở khoá (403)", async () => {
    findById.mockResolvedValue({ settings: { unlocked_tools: ["catalog"] } })
    await expect(requireTenantContext(req("/api/v1/video/jobs"))).rejects.toMatchObject({ code: "ENTITLEMENT_REQUIRED", status: 403 })
  })

  it("cho qua khi công cụ đã mở hoặc tổ chức không bị giới hạn", async () => {
    findById.mockResolvedValue({ settings: { unlocked_tools: ["video"] } })
    await expect(requireTenantContext(req("/api/v1/video/jobs"))).resolves.toBeTruthy()
    findById.mockResolvedValue({ settings: {} })
    await expect(requireTenantContext(req("/api/v1/video/jobs"))).resolves.toBeTruthy()
  })

  it("không đọc settings cho API không thuộc công cụ nào", async () => {
    await expect(requireTenantContext(req("/api/v1/orders"))).resolves.toBeTruthy()
    expect(findById).not.toHaveBeenCalled()
  })
})
