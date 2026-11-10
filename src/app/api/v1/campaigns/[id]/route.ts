import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { getCampaignDetailsUseCase } from "@/modules/marketing-center/use-cases/get-campaign-details.use-case"
import { updateCampaignUseCase } from "@/modules/marketing-center/use-cases/update-campaign.use-case"
import { updateCampaignSchema } from "@/app/api/v1/_contracts/requests-marketing"

export const GET = handle(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M1")

  const { id } = await (context as { params: Promise<{ id: string }> }).params
  const details = await getCampaignDetailsUseCase(ctx, id)

  return jsonResponse({ data: details })
})

export const PATCH = handle(async (request, context) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M3")

  const { id } = await (context as { params: Promise<{ id: string }> }).params

  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== "object") {
    throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
  }

  const parsed = updateCampaignSchema.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".")
      details[field] = issue.message
    }
    throw validationFailed(details)
  }

  const updated = await updateCampaignUseCase(ctx, id, {
    name: parsed.data.name,
    objective: parsed.data.objective,
    occasionCode: parsed.data.occasion_code,
    startsAt: parsed.data.starts_at,
    endsAt: parsed.data.ends_at,
    status: parsed.data.status,
  })

  return jsonResponse({ data: updated })
})
