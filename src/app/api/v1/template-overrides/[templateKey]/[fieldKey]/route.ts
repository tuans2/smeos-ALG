import { jsonResponse } from "@/core/http/response"
import { removeTemplateOverride } from "@/modules/templates/use-cases/remove-template-override"
import { defineRoute } from "@/core/http/define-route"

/** `DELETE /template-overrides/:templateKey/:fieldKey` (nợ #99). */
export const DELETE = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ ctx, params }) => {
      const { templateKey, fieldKey } = params as { templateKey: string; fieldKey: string }
      await removeTemplateOverride(ctx, templateKey, fieldKey)
      return jsonResponse({ ok: true })
  },
})
