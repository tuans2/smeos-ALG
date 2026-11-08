/**
 * Phát một sự kiện nghiệp vụ tới thành viên phù hợp của tổ chức (producer → dispatch).
 *
 * Không bao giờ ném lỗi về luồng nghiệp vụ gọi nó: thông báo hỏng không được làm hỏng đơn hàng.
 * `organizationId` phải đến từ `TenantContext` của bên gọi.
 *
 * @module notification/use-cases
 */
import { log } from "@/core/observability/log"
import { getNotificationEvent } from "../domain/events"
import { fillDeepLink, MAX_RECIPIENTS_PER_EVENT, selectRecipients } from "../domain/notification-recipients"
import { listActiveOrgMembers } from "../infra/notification-recipient-repository"
import { dispatchNotification } from "./dispatch-notification"

export interface NotifyOrganizationInput {
  organizationId: string
  eventKey: string
  /** Người phụ trách — nhận sự kiện ở chế độ OWNER (vd. sale tạo đơn). */
  ownerUserId?: string | null | undefined
  title?: string | undefined
  message?: string | undefined
  /** Link cố định; bỏ trống thì điền deepLinkTemplate của sự kiện bằng `linkVars`. */
  deepLink?: string | undefined
  /** Biến điền vào deepLinkTemplate của sự kiện, vd. { orderId }. */
  linkVars?: Record<string, string> | undefined
  parentOrgId?: string | undefined
}

export type NotifyDeps = {
  listMembers: typeof listActiveOrgMembers
  dispatch: typeof dispatchNotification
}

const defaultDeps: NotifyDeps = { listMembers: listActiveOrgMembers, dispatch: dispatchNotification }

export async function notifyOrganization(input: NotifyOrganizationInput, deps: NotifyDeps = defaultDeps): Promise<number> {
  try {
    const event = getNotificationEvent(input.eventKey)
    if (!event) {
      log.warn("Sự kiện thông báo không có trong danh mục", { eventKey: input.eventKey })
      return 0
    }
    // Đọc dư một chút vì một số thành viên sẽ bị lọc theo vai
    const { organizationType, parentChainOrgId, members } = await deps.listMembers(input.organizationId, MAX_RECIPIENTS_PER_EVENT * 4)
    const recipients = selectRecipients(event, members, { organizationType, ownerUserId: input.ownerUserId ?? null })
    const deepLink = input.deepLink ?? fillDeepLink(event.deepLinkTemplate, input.linkVars ?? {})
    let sent = 0
    let failed = 0
    for (const r of recipients) {
      try {
        const res = await deps.dispatch({
          eventKey: input.eventKey,
          recipient: { userId: r.userId, roleKey: r.roleKey, organizationId: input.organizationId, email: r.email, phone: r.phone },
          title: input.title,
          message: input.message,
          deepLink,
          parentOrgId: input.parentOrgId,
          lockParentOrgId: parentChainOrgId ?? undefined,
        })
        if (res.dispatchedChannels.length > 0) sent++
      } catch (err) {
        failed++
        log.warn("Gửi thông báo cho một người nhận thất bại", { eventKey: input.eventKey, error: err instanceof Error ? err.message : String(err) })
      }
    }
    // SLI gửi thông báo (SLO v1, OPERATIONS_RUNBOOK §10): tỉ lệ failed / recipients theo eventKey
    log.info("notification.dispatched", { eventKey: input.eventKey, organizationId: input.organizationId, recipients: recipients.length, sent, failed })
    return sent
  } catch (err) {
    log.warn("Phát sự kiện thông báo thất bại", { eventKey: input.eventKey, error: err instanceof Error ? err.message : String(err) })
    return 0
  }
}
