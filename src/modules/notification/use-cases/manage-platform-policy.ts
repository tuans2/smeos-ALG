/**
 * MANAGE PLATFORM POLICY USE-CASE
 *
 * Chỉ dành cho SaaS Mother (Console /van-hanh).
 * Kích hoạt / vô hiệu hóa các kênh thông báo toàn nền tảng.
 *
 * @module notification/use-cases
 */
import type { ChannelActivationMap } from "../domain/cascading-policy"
import type { INotificationPreferenceRepository } from "../domain/repositories/notification-preference-repository.interface"
import { getNotificationPreferenceRepository } from "../infra/notification-preference-repository"

export async function getPlatformChannelActivations(
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<ChannelActivationMap> {
  return repo.getChannelActivations()
}

export async function updatePlatformChannelActivation(
  input: {
    channel: string
    activated: boolean
    updatedBy: string
  },
  repo: INotificationPreferenceRepository = getNotificationPreferenceRepository()
): Promise<void> {
  if (input.channel === "APP_INBOX" && !input.activated) {
    throw new Error("Kênh APP_INBOX là kênh cốt lõi hệ thống, không thể vô hiệu hóa.")
  }

  await repo.setChannelActivation(input.channel, input.activated, input.updatedBy)
}
