import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import { ACTIVE_CHAIN_LINK } from "@/modules/organization/infra/organization-links"
import type { IChatLinkPolicy } from "../domain/repositories/chat-repository.interface"

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
}

let defaultPolicy: IChatLinkPolicy | null = null

export function getChatLinkPolicy(): IChatLinkPolicy {
  if (!defaultPolicy) defaultPolicy = new PrismaChatLinkPolicy()
  return defaultPolicy
}
