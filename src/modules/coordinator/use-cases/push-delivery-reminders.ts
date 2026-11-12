/**
 * Đẩy tin nhắc lịch giao M1 / M2 (checklist 4.32) — chạy trong cron 5 phút `POST /internal/chain-dispatch-sweep`.
 *
 * Cùng luật với thanh nhắc `/dieu-phoi` (`getCoordinatorReminders`); mốc đã xác nhận / tạm hoãn không gửi.
 * Mỗi mốc của mỗi đơn gửi tối đa một lần (khoá trong `idempotency_keys`, ghi TRƯỚC khi gửi). Gửi qua
 * `notifyOrganization` nên kênh, người nhận và khoá theo tầng đi theo chính sách thông báo 4 tầng.
 * Không bao giờ ném lỗi ra cron; vòng lặp có trần số tổ chức.
 */
import { log } from "@/core/observability/log"
import { claimIdempotencyKey } from "@/core/idempotency/infra/idempotency-repository"
import { notifyOrganization } from "@/modules/notification/use-cases/notify-organization"
import { DELIVERY_REMINDER_PUSH_SCOPE, dueDeliveryReminderPushes } from "../domain/delivery-reminder-push"
import type { IDispatchReminderRepository } from "../domain/dispatch-reminder-repository-port"
import { listOrganizationsWithOpenOrders } from "../infra/delivery-reminder-sweep-query"
import { PrismaDispatchReminderRepository } from "../infra/prisma-dispatch-reminder-repository"
import { getCoordinatorReminders } from "./get-coordinator-reminders"

export const DELIVERY_REMINDER_EVENT = "DELIVERY_REMINDER_DUE"
const MAX_ORGANIZATIONS = 500

export type PushDeliveryReminderDeps = {
  listOrganizations: (now: Date, limit: number) => Promise<string[]>
  repository: IDispatchReminderRepository
  claim: (organizationId: string, scope: string, key: string) => Promise<boolean>
  notify: typeof notifyOrganization
}

const defaultDeps = (): PushDeliveryReminderDeps => ({
  listOrganizations: listOrganizationsWithOpenOrders,
  repository: new PrismaDispatchReminderRepository(),
  claim: claimIdempotencyKey,
  notify: notifyOrganization,
})

export async function pushDueDeliveryReminders(
  now = new Date(),
  deps: PushDeliveryReminderDeps = defaultDeps(),
): Promise<{ organizations: number; pushed: number; failedOrganizations: number }> {
  let pushed = 0
  let failedOrganizations = 0
  let organizationIds: string[] = []
  try {
    organizationIds = await deps.listOrganizations(now, MAX_ORGANIZATIONS)
  } catch (error) {
    log.error("delivery_reminder_push.list_failed", { error: error instanceof Error ? error.message : String(error) })
    return { organizations: 0, pushed: 0, failedOrganizations: 0 }
  }
  for (const organizationId of organizationIds) {
    try {
      const { reminders } = await getCoordinatorReminders(organizationId, deps.repository, now)
      for (const push of dueDeliveryReminderPushes(reminders, now)) {
        if (!(await deps.claim(organizationId, DELIVERY_REMINDER_PUSH_SCOPE, push.dedupeKey))) continue
        await deps.notify({ organizationId, eventKey: DELIVERY_REMINDER_EVENT, title: push.title, message: push.message })
        pushed++
      }
    } catch (error) {
      failedOrganizations++
      log.warn("delivery_reminder_push.organization_failed", { organizationId, error: error instanceof Error ? error.message : String(error) })
    }
  }
  return { organizations: organizationIds.length, pushed, failedOrganizations }
}
