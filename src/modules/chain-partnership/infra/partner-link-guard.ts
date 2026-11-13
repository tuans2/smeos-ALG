import { prisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_CHAIN_LINK } from "@/modules/organization/infra/organization-links"

/**
 * Tổ chức đối tác có đang liên kết ACTIVE với chuỗi không; nếu có `partnerUserId` thì người đó phải
 * là thành viên ACTIVE của tổ chức đối tác. Dùng trước khi chuỗi đẩy dữ liệu đơn sang đối tác — tránh
 * gửi thông tin khách vào tổ chức tuỳ ý theo id trong body.
 */
export async function isActivePartnerTarget(chainOrgId: string, partnerOrgId: string, partnerUserId?: string | undefined): Promise<boolean> {
  const link = await prisma.organization_links.findFirst({
    where: { parent_org_id: chainOrgId, child_org_id: partnerOrgId, ...ACTIVE_CHAIN_LINK },
    select: { id: true },
  })
  if (!link) return false
  if (!partnerUserId) return true
  const member = await prisma.memberships.findFirst({
    where: { organization_id: partnerOrgId, user_id: partnerUserId, status: "ACTIVE" },
    select: { id: true },
  })
  return !!member
}

/**
 * Người được kéo vào chat nội bộ: thành viên ACTIVE của `targetOrgId`, và `targetOrgId` là chính tổ
 * chức người gọi hoặc có liên kết chuỗi–đối tác ACTIVE (chiều nào cũng được) với tổ chức người gọi.
 */
export async function isAllowedChatTarget(callerOrgId: string, targetOrgId: string, targetUserId: string): Promise<boolean> {
  if (targetOrgId !== callerOrgId) {
    const link = await prisma.organization_links.findFirst({
      where: {
        ...ACTIVE_CHAIN_LINK,
        OR: [
          { parent_org_id: callerOrgId, child_org_id: targetOrgId },
          { parent_org_id: targetOrgId, child_org_id: callerOrgId },
        ],
      },
      select: { id: true },
    })
    if (!link) return false
  }
  const member = await prisma.memberships.findFirst({
    where: { organization_id: targetOrgId, user_id: targetUserId, status: "ACTIVE" },
    select: { id: true },
  })
  return !!member
}
