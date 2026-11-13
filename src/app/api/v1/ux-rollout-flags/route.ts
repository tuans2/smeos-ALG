import { jsonResponse } from "@/core/http/response"
import { enabledUxRolloutFlagsFor } from "@/modules/platform/domain/ux-rollout-flags"
import { getUxRolloutFlags } from "@/modules/platform/infra/ux-rollout-flag-store"
import { defineRoute } from "@/core/http/define-route"

/** Cờ rollout UX đang bật cho tổ chức của phiên — không trả danh sách tổ chức khác (03c E9). */
export const GET = defineRoute({
  auth: { kind: "tenant", capability: null, reason: "chỉ đọc cờ giao diện đang bật cho chính tổ chức của phiên (03c E9)" },
  handler: async ({ ctx }) => {
    const flags = await getUxRolloutFlags()
    return jsonResponse({ data: { enabled: enabledUxRolloutFlagsFor(flags, ctx.organizationId) } })
  },
})

export const dynamic = "force-dynamic" as const
export const revalidate = 0 as const
