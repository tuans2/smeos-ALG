import { jsonResponse } from "@/core/http/response"
import { validationFailed } from "@/core/http/errors"
import { isGovernanceSystem } from "@/modules/organization/domain/governance-decisions"
import { getGovernanceMatrix, saveGovernanceMatrix } from "@/modules/organization/use-cases/governance-matrix"
import { defineRoute } from "@/core/http/define-route"

function systemFrom(request: Request) {
  const system = new URL(request.url).searchParams.get("system")
  if (!isGovernanceSystem(system)) throw validationFailed({ reason: "Thiếu hoặc sai loại ma trận" })
  return system
}

export const GET = defineRoute({
  auth: { kind: "tenant", capability: "F1" },
  handler: async ({ request, ctx }) => {
    return jsonResponse({ data: await getGovernanceMatrix(ctx, systemFrom(request)) })
  },
})

export const PUT = defineRoute({
  auth: { kind: "tenant", capability: "F2" },
  handler: async ({ request, ctx }) => {
    const system = systemFrom(request)
    const body = (await request.json().catch(() => null)) as { decisions?: unknown } | null
    return jsonResponse({ data: await saveGovernanceMatrix(ctx, system, body?.decisions) })
  },
})

export const dynamic = "force-dynamic" as const
