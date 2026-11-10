import { handle, jsonResponse } from "@/core/http/response"
import { patchOrgPolicySchema } from "@/app/api/v1/_contracts/requests-notification"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import {
  getOrgNotificationPolicies,
  updateOrgNotificationPolicy,
} from "@/modules/notification/use-cases/manage-org-policy"
import type { NotifyChannel, NotifyPriority } from "@/modules/notification/domain/events/_contract"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F1")
  const policies = await getOrgNotificationPolicies(ctx.organizationId)
  return jsonResponse({ data: policies })
})

export const PATCH = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "F2")
  const body = patchOrgPolicySchema.parse(await request.json())

  await updateOrgNotificationPolicy({
    organizationId: ctx.organizationId,
    eventKey: body.eventKey,
    channel: body.channel as NotifyChannel,
    roleKey: body.roleKey,
    enabled: body.enabled,
    priorityOverride: body.priorityOverride as NotifyPriority | undefined,
  })

  return jsonResponse({ success: true, updated: body })
})
