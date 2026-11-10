import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { updateUsageSchema } from "@/app/api/v1/_contracts/requests-storage"
import { requireCapability } from "@/core/rbac/capabilities"
import { requireTenantContext } from "@/modules/organization/use-cases/resolve-session"
import type { UsageDestination } from "@/modules/marketing-center/domain/asset-type"
import type { AssetUsageStatus } from "@/modules/marketing-center/domain/asset-usage"
import type { CtaCode } from "@/modules/marketing-center/domain/cta-registry"
import { updateAssetUsageUseCase } from "@/modules/marketing-center/use-cases/update-asset-usage.use-case"

export const PATCH = handle(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { ctx } = await requireTenantContext(request)
  requireCapability(ctx, "M2")

  const { id } = await params
  if (!id) {
    throw validationFailed({ id: "Thiếu id nơi dùng" })
  }

  const body = await request.json().catch(() => null)
  const parsed = updateUsageSchema.safeParse(body)
  if (!parsed.success) {
    throw validationFailed({ issues: parsed.error.issues })
  }

  const { data } = parsed
  const updated = await updateAssetUsageUseCase(ctx, {
    id,
    title: data.title,
    ctaCode: data.cta_code as CtaCode | undefined,
    destination: data.destination as UsageDestination | undefined,
    status: data.status as AssetUsageStatus | undefined,
    config: data.config,
  })

  return jsonResponse({ data: updated })
})

