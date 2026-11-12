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
  handler: async ({ request, ctx }) => {
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
  },
})
