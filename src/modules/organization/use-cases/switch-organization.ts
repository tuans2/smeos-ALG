import { notFound } from "@/core/http/errors"
import { assertOrganizationLifecycle } from "./assert-organization-lifecycle"
import { MembershipRepository, getMembershipRepository } from "@/modules/organization/infra/membership-repository"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { SessionRepository, getSessionRepository } from "@/modules/organization/infra/session-repository"

import type { OrganizationSummary } from "./list-organizations"

/**
 * `POST /api/v1/session/organization` — **chỗ duy nhất** client được nêu tên
 * một tổ chức (đặc tả 06 mục 2).
 *
 * Chính vì thế nó là chỗ duy nhất phải đối chiếu `memberships` trước khi ghi
 * `sessions.organization_id`. Tổ chức không tồn tại và tổ chức người gọi không
 * thuộc về trả về **cùng một** kết quả: không tìm thấy. Trả lỗi quyền ở đây là
 * xác nhận tổ chức đó có thật (`YC-T4`).
 */
export async function switchOrganization(input: {
  userId: string
  sessionId: string
  organizationId: string
}): Promise<OrganizationSummary> {
  const membership = await getMembershipRepository().findForUserInOrganization(
    input.userId,
    input.organizationId
  )
  if (!membership || membership.status !== "ACTIVE") throw notFound()
  // Tổ chức tạm ngưng / đã đóng → không chuyển vào (audit User Journey UJ-27): trước đây chuyển được rồi mọi màn 403
  await assertOrganizationLifecycle(input.organizationId, "GET")

  await getSessionRepository().setActiveOrganization(input.sessionId, input.organizationId)

  const organizations = await getOrganizationRepository().listForUser(input.userId)
  const organization = organizations.find((row) => row.id === input.organizationId)
  if (!organization) throw notFound()

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    type: organization.type,
    lifecycle_status: organization.lifecycle_status ?? "ACTIVE",
  }
}
