import { validationFailed } from "@/core/http/errors"
import { enumParam } from "@/core/http/query-params"
import { handle, jsonResponse } from "@/core/http/response"
import { createUsageSchema, USAGE_DESTINATION_VALUES, USAGE_STATUS_VALUES } from "@/app/api/v1/_contracts/requests-storage"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import type { UsageDestination } from "@/modules/marketing-center/domain/asset-type"
import type { CtaCode } from "@/modules/marketing-center/domain/cta-registry"
import { createAssetUsageUseCase } from "@/modules/marketing-center/use-cases/create-asset-usage.use-case"
import { listAssetUsagesUseCase } from "@/modules/marketing-center/use-cases/list-asset-usages.use-case"

export const GET = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M1")

  const url = new URL(request.url)
  const sourceType = url.searchParams.get("source_type") ?? undefined
  const sourceId = url.searchParams.get("source_id") ?? undefined
  const destination = enumParam(url, "destination", USAGE_DESTINATION_VALUES) as UsageDestination | undefined
  const status = enumParam(url, "status", USAGE_STATUS_VALUES)

  const take = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50
  if (!Number.isInteger(take) || take < 1 || take > 100) {
    throw validationFailed({ limit: "limit phải là số nguyên từ 1 đến 100" })
  }

  const items = await listAssetUsagesUseCase(ctx, {
    sourceType,
    sourceId,
    destination,
    status,
    take,
  })

  return jsonResponse({ data: items })
})

export const POST = handle(async (request) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M2")

  const body = await request.json().catch(() => null)
  const parsed = createUsageSchema.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const { data } = parsed
  const result = await createAssetUsageUseCase(ctx, {
    sourceType: data.source_type,
    sourceId: data.source_id,
    assetTypeCode: data.asset_type_code,
    destination: data.destination as UsageDestination,
    ctaCode: data.cta_code as CtaCode,
    title: data.title,
    channelId: data.channel_id,
    targetPath: data.target_path,
    campaignId: data.campaign_id,
    config: data.config,
  })

  return jsonResponse({ data: result }, { status: 201 })
})

