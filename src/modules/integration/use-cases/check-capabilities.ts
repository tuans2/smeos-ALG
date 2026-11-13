import type { IntegrationContext } from "@/modules/integration/use-cases/resolve-integration-context"
import { isCapabilityCode } from "@/core/rbac/capability-catalog"
import { CapabilityRepository, getCapabilityRepository } from "@/modules/organization/infra/capability-repository"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { RoleRepository, getRoleRepository } from "@/modules/organization/infra/role-repository"

export type CheckCapabilitiesResult = Record<string, boolean>

/**
 * `POST /integration/capabilities/check` (đặc tả 06 mục 11): "Hỏi một người
 * có năng lực gì" — dùng khi giao diện của `LocalBudd`/`SocialFlow` cần biết
 * trước một người trong tổ chức có được phép làm một việc hay không (ví dụ
 * `landing.publish`), mà không cấp cho engine ngoài quyền đọc `memberships`
 * đầy đủ.
 *
 * `userId` phải là thành viên ĐANG HOẠT ĐỘNG của đúng tổ chức mang trong
 * token (`ic.organizationId`) — không đường nào cho engine ngoài hỏi năng
 * lực của một người ở tổ chức khác. Người không khớp trả về tất cả `false`,
 * không phải lỗi, cùng lý do `YC-T4`: một mã lỗi riêng sẽ xác nhận `userId`
 * có tồn tại ở tổ chức khác.
 */
export async function checkCapabilities(
  ic: IntegrationContext,
  input: { userId: string; codes: readonly string[] }
): Promise<CheckCapabilitiesResult> {
  const codes = input.codes.filter(isCapabilityCode)
  const allFalse = (): CheckCapabilitiesResult =>
    Object.fromEntries(codes.map((code) => [code, false]))

  const membership = await getMembershipRepository().findForUserInOrganization(
    input.userId,
    ic.organizationId
  )
  if (!membership || membership.status !== "ACTIVE") return allFalse()

  const role = await getRoleRepository().findAssignableByIdForOrganization(
    ic.organizationId,
    membership.role_id
  )
  if (!role) return allFalse()

  const grants = await getCapabilityRepository().resolveGrants(
    ic.organizationId,
    role.id,
    role.key
  )
  const granted = new Set(grants.map((grant) => grant.code))

  return Object.fromEntries(codes.map((code) => [code, granted.has(code)]))
}
