import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { CAMPAIGN_OBJECTIVES, CAMPAIGN_STATUSES } from "@/modules/marketing-center/domain/campaign"
import { handle, jsonResponse } from "@/core/http/response"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import { createCampaignUseCase } from "@/modules/marketing-center/use-cases/create-campaign.use-case"
import { listCampaignsUseCase } from "@/modules/marketing-center/use-cases/list-campaigns.use-case"
import { createCampaignSchema } from "@/app/api/v1/_contracts/requests-marketing"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M1")

  const url = new URL(request.url)
  const status = enumParam(url, "status", CAMPAIGN_STATUSES)
  const objective = enumParam(url, "objective", CAMPAIGN_OBJECTIVES)
  const cursor = url.searchParams.get("cursor") ?? undefined

  const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
  }

  const result = await listCampaignsUseCase(ctx, {
    status,
    objective,
    limit,
    cursor,
  })

  return jsonResponse({
    data: result.items,
    counts: result.counts,
    next_cursor: result.nextCursor,
  })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M3")

  const raw = await request.json().catch(() => null)
  if (!raw || typeof raw !== "object") {
    throw validationFailed({ body: "Dữ liệu yêu cầu không hợp lệ" })
  }

  const parsed = createCampaignSchema.safeParse(raw)
  if (!parsed.success) {
    const details: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const field = issue.path.join(".")
      details[field] = issue.message
    }
    throw validationFailed(details)
  }

  const campaign = await createCampaignUseCase(ctx, {
    name: parsed.data.name,
    objective: parsed.data.objective,
    occasionCode: parsed.data.occasion_code,
    startsAt: parsed.data.starts_at,
    endsAt: parsed.data.ends_at,
    status: parsed.data.status,
  })

  return jsonResponse({ data: campaign }, { status: 201 })
})
