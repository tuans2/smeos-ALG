import { jsonResponse } from "@/core/http/response"
import { patchOrgPolicySchema } from "@/app/api/v1/_contracts/requests-notification"
import {
  getOrgNotificationPolicies,
  updateOrgNotificationPolicy,
} from "@/modules/notification/use-cases/manage-org-policy"
import type { NotifyChannel, NotifyPriority } from "@/modules/notification/domain/events/_contract"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ ctx }) => {
    const policies = await getOrgNotificationPolicies(ctx.organizationId)
    return jsonResponse({ data: policies })
  },
})

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  body: patchOrgPolicySchema,
  handler: async ({ ctx, body }) => {
    await updateOrgNotificationPolicy({
      organizationId: ctx.organizationId,
      eventKey: body.event_key,
      channel: body.channel as NotifyChannel,
      roleKey: body.role_key,
      enabled: body.enabled,
      priorityOverride: body.priority_override as NotifyPriority | undefined,
    })

    return jsonResponse({ data: body })
  },
})
