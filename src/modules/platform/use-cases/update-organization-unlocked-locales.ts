import { notFound, validationFailed } from "@/core/http/errors"
import type { PlatformContext } from "@/core/platform/platform-context"
import { requirePlatformCapability } from "@/core/platform/platform-capabilities"
import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { recordAuditLog } from "@/modules/audit/use-cases/record-audit-log"
import {
  SAAS_UNLOCKED_LOCALES_KEY,
  SAAS_PENDING_LANGUAGE_UNLOCK_KEY,
} from "@/modules/greeting-card/domain/brochure-language-policy"

export type UpdateUnlockedLocalesInput = {
  organizationId: string
  unlockedLocales: string[]
}

/**
 * Admin SaaS cập nhật danh sách ngôn ngữ được mở khóa cho tổ chức (N2 capability).
 */
export async function updateOrganizationUnlockedLocales(
  pctx: PlatformContext,
  input: UpdateUnlockedLocalesInput
): Promise<{ success: true; organizationId: string; unlockedLocales: string[] }> {
  requirePlatformCapability(pctx, "N2")

  const orgRepo = getOrganizationRepository()
  const org = await orgRepo.findById(input.organizationId)
  if (!org) throw notFound()

  // Luôn bắt buộc phải có ít nhất 'vi'
  const validLocales = Array.from(
    new Set(["vi", ...input.unlockedLocales.filter((l) => l === "vi" || l === "en")])
  )

  const currentSettings =
    org.settings && typeof org.settings === "object"
      ? (org.settings as Record<string, unknown>)
      : {}

  const updatedSettings = {
    ...currentSettings,
    [SAAS_UNLOCKED_LOCALES_KEY]: validLocales,
  }
  // Khi đã cập nhật quyền mở khóa, xóa cờ yêu cầu chờ duyệt
  delete (updatedSettings as Record<string, unknown>)[SAAS_PENDING_LANGUAGE_UNLOCK_KEY]

  await orgRepo.updateTypeAndSettings(org.id, org.type, updatedSettings)

  await recordAuditLog(
    {
      organizationId: org.id,
      workspaceId: "",
      userId: pctx.userId,
      branchId: null,
      capabilities: new Set(["N2"]),
    },
    {
      action: "platform.organization_unlocked_locales_updated",
      entityType: "organizations",
      entityId: org.id,
      before: { unlocked_locales: (currentSettings[SAAS_UNLOCKED_LOCALES_KEY] as string[]) ?? ["vi"] },
      after: {
        unlocked_locales: validLocales,
        updated_by: pctx.userId,
      },
    }
  )

  return {
    success: true,
    organizationId: input.organizationId,
    unlockedLocales: validLocales,
  }
}
