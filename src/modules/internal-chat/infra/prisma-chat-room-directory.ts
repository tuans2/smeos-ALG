import type { PrismaClient } from "@/generated/prisma/client"
import { prisma as defaultPrisma } from "@/core/tenancy/infra/prisma"
import type { IChatRoomDirectory } from "../use-cases/open-room"
import type { ChatRoomOwnerLookup } from "../use-cases/post-subcontract-message"

/** Tra cứu tên tổ chức / chi nhánh để đặt tên phòng khi mở lần đầu. */
export class PrismaChatRoomDirectory implements IChatRoomDirectory, ChatRoomOwnerLookup {
  constructor(private readonly prisma: PrismaClient = defaultPrisma) {}

  async organizationName(organizationId: string): Promise<string | null> {
    const row = await this.prisma.organizations.findUnique({ where: { id: organizationId }, select: { name: true } })
    return row?.name ?? null
  }

  async firstActiveMemberId(organizationId: string): Promise<string | null> {
    const row = await this.prisma.memberships.findFirst({ where: { organization_id: organizationId, status: "ACTIVE" }, orderBy: { joined_at: "asc" }, select: { user_id: true } })
    return row?.user_id ?? null
  }

  async branchName(organizationId: string, branchId: string): Promise<string | null> {
    const row = await this.prisma.branches.findFirst({ where: { id: branchId, organization_id: organizationId, is_active: true }, select: { name: true } })
    return row?.name ?? null
  }
}
