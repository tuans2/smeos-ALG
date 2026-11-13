/**
 * MANAGE ORG POLICY USE-CASE
 *
 * Dành cho Tier 2 (SaaS Ngành / ChainOS) cấu hình chính sách thông báo tổ chức.
 *
 * @module notification/use-cases
 */
import type { NotifyChannel, NotifyPriority } from "../domain/events/_contract"
import type { PreferenceRecord } from "../domain/cascading-policy"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export async function getOrgNotificationPolicies(
  organizationId: string,
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<PreferenceRecord[]> {
  return repo.getOrgPolicies(organizationId)
}

export async function updateOrgNotificationPolicy(
  input: {
    organizationId: string
    eventKey: string
    channel: NotifyChannel
    roleKey: string
    enabled: boolean
    priorityOverride?: NotifyPriority | undefined
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  await repo.upsertOrgPolicy(input)
}
