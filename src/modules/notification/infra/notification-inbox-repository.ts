/**
 * NOTIFICATION INBOX REPOSITORY
 *
 * Tách riêng thao tác truy xuất dữ liệu In-App Notification Center
 * để đảm bảo SRP và giới hạn 350 dòng/tệp.
 *
 * @module notification/infra
 */
import { prisma } from "@/core/tenancy/infra/prisma"
import type {
  InboxItemRecord,
  CreateInboxItemInput,
  ListInboxOptions,
} from "../domain/repositories/notification-preference-repository.interface"

export class NotificationInboxRepository {
  async createInboxItem(item: CreateInboxItemInput): Promise<{ id: string; createdAt: Date }> {
    const created = await prisma.notification_inbox.create({
      data: {
        user_id: item.userId,
        organization_id: item.organizationId,
        event_key: item.eventKey,
        title: item.title,
        message: item.message,
        deep_link: item.deepLink ?? null,
        priority: item.priority ?? "NORMAL",
      },
      select: { id: true, created_at: true },
    })
    return { id: created.id, createdAt: created.created_at }
  }

  async markInboxRead(id: string, userId: string, orgId: string): Promise<boolean> {
    const res = await prisma.notification_inbox.updateMany({
      where: { id, user_id: userId, organization_id: orgId },
      data: { is_read: true, read_at: new Date() },
    })
    return res.count > 0
  }

  async markAllInboxRead(userId: string, orgId: string): Promise<number> {
    const res = await prisma.notification_inbox.updateMany({
      where: { user_id: userId, organization_id: orgId, is_read: false },
      data: { is_read: true, read_at: new Date() },
    })
    return res.count
  }

  async listInboxItems(
    userId: string,
    orgId: string,
    options?: ListInboxOptions | undefined
  ): Promise<{ items: InboxItemRecord[]; total: number; unreadCount: number }> {
    const page = Math.max(1, options?.page ?? 1)
    const limit = Math.min(100, Math.max(1, options?.limit ?? 20))
    const skip = (page - 1) * limit

    const where = {
      user_id: userId,
      organization_id: orgId,
      ...(options?.unreadOnly ? { is_read: false } : {}),
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notification_inbox.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
      prisma.notification_inbox.count({ where }),
      prisma.notification_inbox.count({
        where: { user_id: userId, organization_id: orgId, is_read: false },
      }),
    ])

    return {
      items: items.map((r) => ({
        id: r.id,
        userId: r.user_id,
        organizationId: r.organization_id,
        eventKey: r.event_key,
        title: r.title,
        message: r.message,
        deepLink: r.deep_link,
        priority: r.priority,
        isRead: r.is_read,
        readAt: r.read_at,
        createdAt: r.created_at,
      })),
      total,
      unreadCount,
    }
  }
}

let inboxRepoInstance: NotificationInboxRepository | null = null

export function getNotificationInboxRepository(): NotificationInboxRepository {
  if (!inboxRepoInstance) {
    inboxRepoInstance = new NotificationInboxRepository()
  }
  return inboxRepoInstance
}
