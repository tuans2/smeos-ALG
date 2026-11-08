import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { recordPlatformAccess } from "@/modules/audit/use-cases/record-platform-access"
import { getOrganization } from "@/modules/platform/use-cases/get-organization"
import { approveOrganizationModelChange } from "@/modules/platform/use-cases/approve-organization-model-change"
import { decidePublicChatLimits } from "@/modules/platform/use-cases/decide-public-chat-limits"
import { setBranchScopeWave1 } from "@/modules/platform/use-cases/set-branch-scope-wave"
import { getOrganizationRepository } from "@/modules/organization/infra/organization-repository"
import { organizationPatchBody } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params
  return jsonResponse({ data: await getOrganization(pctx, id) })
})

export const PATCH = handle(async (request, context: { params: Promise<{ id: string }> }) => {
  const pctx = await requirePlatformContext(request)
  await recordPlatformAccess(request, pctx) // D-60: ghi trước khi đọc/ghi dữ liệu tổ chức
  const { id } = await context.params

  const parsed = organizationPatchBody.safeParse(await request.json().catch(() => null))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

  let result: unknown = { success: true }

  if (parsed.data.target_type) {
    result = await approveOrganizationModelChange(pctx, {
      organizationId: id,
      targetType: parsed.data.target_type,
      note: parsed.data.note ?? null,
    })
  }

  if (parsed.data.unlocked_locales) {
    const { updateOrganizationUnlockedLocales } = await import(
      "@/modules/platform/use-cases/update-organization-unlocked-locales"
    )
    result = await updateOrganizationUnlockedLocales(pctx, {
      organizationId: id,
      unlockedLocales: parsed.data.unlocked_locales,
    })
  }

  if (parsed.data.clear_pending_language_unlock) {
    const orgRepo = getOrganizationRepository()
    const org = await orgRepo.findById(id)
    if (org) {
      const settings = (org.settings as Record<string, unknown> | null) ?? {}
      const { pending_language_unlock: _, ...rest } = settings
      await orgRepo.updateTypeAndSettings(org.id, org.type, rest)
    }
    result = { success: true, action: "clear_pending_language_unlock" }
  }

  if (parsed.data.clear_pending_model_change) {
    const orgRepo = getOrganizationRepository()
    const org = await orgRepo.findById(id)
    if (org) {
      const settings = (org.settings as Record<string, unknown> | null) ?? {}
      const { pending_model_change: _, ...rest } = settings
      await orgRepo.updateTypeAndSettings(org.id, org.type, rest)
    }
    result = { success: true, action: "clear_pending_model_change" }
  }

  if (parsed.data.public_chat_limits_decision) {
    result = await decidePublicChatLimits(pctx, {
      organizationId: id,
      approve: parsed.data.public_chat_limits_decision === "approve",
    })
  }

  if (parsed.data.branch_scope_wave1 !== undefined) {
    result = await setBranchScopeWave1(pctx, { organizationId: id, enabled: parsed.data.branch_scope_wave1 })
  }

  return jsonResponse({ data: result })
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const

