import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { phoneEquals } from "@/core/security/pii-lookup"

/** Ghi yêu cầu tư vấn: một hội thoại + tin đầu của khách, trong một giao dịch. */
export class ProductInquiryRepository {
  async create(input: {
    organizationId: string
    customerId: string
    title: string
    content: string
    metadata: Record<string, unknown>
  }): Promise<{ conversationId: string }> {
    return prisma.$transaction(async (tx) => {
      const conv = await tx.chat_conversations.create({
        data: {
          organization_id: input.organizationId,
          customer_id: input.customerId,
          title: input.title,
          channel: "STOREFRONT_CATALOG",
          status: "ACTIVE",
        },
        select: { id: true },
      })
      await tx.chat_messages.create({
        data: {
          organization_id: input.organizationId,
          conversation_id: conv.id,
          sender_type: "USER",
          content: input.content,
          metadata: input.metadata as Prisma.InputJsonObject,
        },
      })
      return { conversationId: conv.id }
    })
  }

  /** Số yêu cầu gần đây của một SĐT — chặn gửi dồn. */
  async countRecentByPhone(organizationId: string, phone: string, since: Date): Promise<number> {
    return prisma.chat_conversations.count({
      where: {
        organization_id: organizationId,
        channel: "STOREFRONT_CATALOG",
        created_at: { gte: since },
        customer: phoneEquals(organizationId, phone), // P-5b
      },
    })
  }
}
