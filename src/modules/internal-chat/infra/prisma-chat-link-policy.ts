import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_CHAIN_LINK, CHAIN_LINK_TYPES } from "@/modules/organization/infra/organization-links"
import type { IChatLinkPolicy } from "../domain/repositories/chat-repository.interface"
import type { LinkState } from "../domain/conversation-access-policy"

/** Liên kết chuỗi–đối tác ACTIVE giữa hai tổ chức, chiều nào cũng được (chuỗi ↔ cửa hàng). */
export class PrismaChatLinkPolicy implements IChatLinkPolicy {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async hasActiveLink(organizationIdA: string, organizationIdB: string): Promise<boolean> {
    if (organizationIdA === organizationIdB) return true
    const link = await this.prisma.organization_links.findFirst({
      where: {
        ...ACTIVE_CHAIN_LINK,
        OR: [
          { parent_org_id: organizationIdA, child_org_id: organizationIdB },
          { parent_org_id: organizationIdB, child_org_id: organizationIdA },
        ],
      },
      select: { id: true },
    })
    return !!link
  }

  async linkState(chainOrgId: string, partnerOrgId: string): Promise<LinkState> {
    const link = await this.prisma.organization_links.findUnique({
      where: { parent_org_id_child_org_id: { parent_org_id: chainOrgId, child_org_id: partnerOrgId } },
      select: { status: true, link_type: true },
    })
    if (!link || !(CHAIN_LINK_TYPES as readonly string[]).includes(link.link_type)) return "OTHER"
    return link.status === "ACTIVE" || link.status === "SUSPENDED" ? link.status : "OTHER"
  }
}

let defaultPolicy: IChatLinkPolicy | null = null

export function getChatLinkPolicy(): IChatLinkPolicy {
  if (!defaultPolicy) defaultPolicy = new PrismaChatLinkPolicy()
  return defaultPolicy
}
