import { conflict, validationFailed } from "@/core/http/errors"
import type { TenantContext } from "@/core/tenancy"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import {
  SAAS_PENDING_LANGUAGE_UNLOCK_KEY,
  SAAS_UNLOCKED_LOCALES_KEY,
  type PendingLanguageUnlockRequest,
} from "@/modules/greeting-card/domain/brochure-language-policy"

export type RequestLanguageUnlockInput = {
  note?: string | null
}

/**
 * Điều hành cửa hàng gửi yêu cầu mở khóa gói Ngôn Ngữ Quốc Tế (Tiếng Anh) lên Admin SaaS (F2 capability).
 * Yêu cầu được lưu vào `settings.pending_language_unlock` để Admin SaaS phê duyệt.
 */
export async function requestLanguageUnlock(
  ctx: TenantContext,
  input: RequestLanguageUnlockInput
): Promise<{ recorded: true; pendingRequest: PendingLanguageUnlockRequest }> {
  const orgRepo = getOrganizationRepository()
  const organization = await orgRepo.current(ctx)
  if (!organization) throw validationFailed({ organization: "Không tìm thấy tổ chức" })

  const currentSettings =
    organization.settings && typeof organization.settings === "object"
      ? (organization.settings as Record<string, unknown>)
      : {}

  const unlockedLocales = Array.isArray(currentSettings[SAAS_UNLOCKED_LOCALES_KEY])
    ? (currentSettings[SAAS_UNLOCKED_LOCALES_KEY] as string[])
    : ["vi"]

  if (unlockedLocales.includes("en")) {
    throw conflict("Cửa hàng của bạn đã được mở khóa Tiếng Anh trước đó")
  }

  const pendingRequest: PendingLanguageUnlockRequest = {
    requested_locales: ["en"],
    requested_at: new Date().toISOString(),
    requested_by: ctx.userId,
    note: input.note ?? null,
  }

  await orgRepo.updateSettings(ctx, {
    ...currentSettings,
    [SAAS_PENDING_LANGUAGE_UNLOCK_KEY]: pendingRequest,
  })

  await recordAuditLog(ctx, {
    action: "organization.language_unlock_requested",
    entityType: "organizations",
    entityId: organization.id,
    before: { unlocked_locales: unlockedLocales },
    after: {
      requested_locales: ["en"],
      requested_by: ctx.userId,
      note: input.note ?? null,
    },
  })

  return { recorded: true, pendingRequest }
}
