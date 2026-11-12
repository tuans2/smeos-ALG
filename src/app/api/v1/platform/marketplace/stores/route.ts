/** GET /api/v1/platform/marketplace/stores — danh sách chợ đối tác (`N1`), ảnh qua URL ký có hạn. */

import { validationFailed } from "@/core/http/errors"
import { jsonResponse } from "@/core/http/response"
import { listMarketplaceStores } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { marketplaceStoresQuery } from "@/app/api/v1/platform/_contracts/requests"
import { defineRoute } from "@/core/http/define-route"

export const GET = defineRoute({
  auth: { kind: "platform", capability: null, reason: "mã năng lực nền tảng kiểm ở use-case (requirePlatformCapability)" },
  handler: async ({ request, pctx }) => {
    const parsed = marketplaceStoresQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams))
    if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
    return jsonResponse({ data: await listMarketplaceStores(pctx, parsed.data) })
  },
})

export const dynamic = "force-dynamic"
