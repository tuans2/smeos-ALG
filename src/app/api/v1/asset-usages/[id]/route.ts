import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { updateUsageSchema } from "@/app/api/v1/_contracts/requests-storage"
import type { UsageDestination } from "@/modules/marketing-center/domain/asset-type"
import type { AssetUsageStatus } from "@/modules/marketing-center/domain/asset-usage"
import type { CtaCode } from "@/modules/marketing-center/domain/cta-registry"
import { updateAssetUsageUseCase } from "@/modules/marketing-center/use-cases/update-asset-usage.use-case"
import { defineRoute } from "@/core/http/define-route"

export const PATCH = defineRoute({
  auth: { kind: "tenant", capability: "M2" },
  handler: async ({ request, ctx, params }) => {
    const { id } = params as { id: string }
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
  },
})

