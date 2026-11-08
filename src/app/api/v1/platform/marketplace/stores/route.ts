/** GET /api/v1/platform/marketplace/stores — danh sách chợ đối tác (`N1`), ảnh qua URL ký có hạn. */

import { validationFailed } from "@/core/http/errors"
import { handle, jsonResponse } from "@/core/http/response"
import { listMarketplaceStores } from "@/modules/platform/use-cases/manage-partner-marketplace"
import { requirePlatformContext } from "@/modules/platform/use-cases/resolve-platform-session"
import { marketplaceStoresQuery } from "@/app/api/v1/platform/_contracts/requests"

export const GET = handle(async (request) => {
  const pctx = await requirePlatformContext(request)
  const parsed = marketplaceStoresQuery.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) throw validationFailed({ issues: parsed.error.issues })
  return jsonResponse({ data: await listMarketplaceStores(pctx, parsed.data) })
})

export const dynamic = "force-dynamic"
