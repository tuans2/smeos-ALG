/**
 * MANAGE INBOX USE-CASE
 *
 * Xử lý danh sách thông báo In-App Inbox, đánh dấu đã đọc.
 *
 * @module notification/use-cases
 */
import type {
  INotificationPreferenceRepository,
  InboxItemRecord,
  ListInboxOptions,
} from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export async function listUserInbox(
  userId: string,
  organizationId: string,
  options?: ListInboxOptions | undefined,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<{ items: InboxItemRecord[]; total: number; unreadCount: number }> {
  return repo.listInboxItems(userId, organizationId, options)
}

export async function markInboxItemRead(
  id: string,
  userId: string,
  organizationId: string,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<boolean> {
  return repo.markInboxRead(id, userId, organizationId)
}

export async function markAllInboxItemsRead(
  userId: string,
  organizationId: string,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<number> {
  return repo.markAllInboxRead(userId, organizationId)
}
