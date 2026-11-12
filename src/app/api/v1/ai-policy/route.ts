import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { getAiPolicy } from "@/modules/ai-governance/use-cases/get-ai-policy"
import { putAiPolicy } from "@/modules/ai-governance/use-cases/put-ai-policy"
import { putAiPolicyBody } from "@/app/api/v1/_contracts/requests-admin"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "U1" },
  handler: async ({ ctx }) => {
    return jsonResponse(await getAiPolicy(ctx))
  },
})

/**
 * Ghi TRẦN của một năng lực. Đổi `AIC-01` đòi thêm `H4` — kiểm trong use-case,
 * không kiểm ở đây, để đường ghi của engine ngoài về sau không đi vòng qua nó.
 */
export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "U2" },
  handler: async ({ request, ctx }) => {
    const parsed = putAiPolicyBody.safeParse(await request.json().catch(() => null))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })

    return jsonResponse(await putAiPolicy(ctx, parsed.data))
  },
})
